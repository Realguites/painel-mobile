import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Button } from 'react-native';
import {BluetoothManager,BluetoothEscposPrinter,BluetoothTscPrinter} from 'react-native-bluetooth-escpos-printer';
import KeepAwake from 'react-native-keep-awake';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/Ionicons';

const MyApp = () => {
  const [printer, setPrinter] = useState(undefined);
  const [loading, setLoading] = useState(true); // Estado para o carregamento
  const [mensagemLoading, setMensagemLoading] = useState('');
  const [isErro, setErro] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const [autorizado, setAutorizado] = useState(false);
  const [nrDispositivo, setNrDispositivo] = useState('');
  const impressorasHabilitadas = ["MPT-II", "MPT-III", "MPT-XS"];


  function changeKeepAwake(shouldBeAwake) {
    if (shouldBeAwake) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }
  }
   
  const handleSubmit = async () => {
    const url = 'http://192.168.0.116:8080/smartphones'; // URL do servidor

    try {
      const response = await fetch(url, {
        method: 'POST', // método HTTP
        headers: {
          'Content-Type': 'application/json', // tipo de conteúdo
        },
        body: JSON.stringify({
          nrIdentificacao: nrDispositivo,
        }),
      });
      const json = await response.json();
      setAutorizado(json.ativo);
      console.log("BATATA ", json, response)
      
    } catch (error) {
        setErro(true);
        setMensagemErro(error.message);
    }finally{
      if(!autorizado){
        setErro(true);
        console.log("lkdsfjkdlsjfdlksjfdkslfjdslk")
        setMensagemErro('Smartphone não autorizado para gerar fichas, favor liberar no Portal!');
      }
    }
  };

  const solicitarFicha = async (identPrioridade) => {
    const url = 'http://192.168.0.116:8080/fichas/' + nrDispositivo; // URL do servidor
    try {
      const response = await fetch(url, {
        method: 'POST', // método HTTP
        headers: {
          'Content-Type': 'application/json', // tipo de conteúdo
        },
        body: JSON.stringify({
          identPrioridade: identPrioridade,
        }),
      });
      const json = await response.json();
      if(response.status === 201){
        print(json);
      }
      
    } catch (error) {
        setErro(true);
        setMensagemErro(error.message);
    } finally{
      
    }
  };
  const buscarDispositivos = async () => {
    try {
      setNrDispositivo(await DeviceInfo.getUniqueId());
      setMensagemLoading("Buscando informações no servidor...")
      handleSubmit()//verifica se o smartphone está apto para enviar fichas
      if(!autorizado){
        return;
      }
      setMensagemLoading("Buscando impressora...")
      const s = await BluetoothManager.scanDevices();
      let pareados = JSON.parse(s).paired;
      let encontrados = JSON.parse(s).found;
      if(pareados.length > 0){
          const printerCandidate = buscarPareadas(pareados);
          if(printerCandidate !==null){//pode n encontrar pareadas, precisa buscar as não pareadas
            setPrinter(printerCandidate);
          }else{
            if(encontrados.length > 0){
              printerCandidate = buscarNaoPareadas(encontrados);
              if(printerCandidate !==null){//pode n encontrar pareadas, precisa buscar as não pareadas
                setPrinter(printerCandidate);
              }else{
                setErro(true);
                setMensagemErro("Nenhuma Impressora encontrada!");
                return
              }
            }else{
              setErro(true);
              setMensagemErro("Nenhuma Impressora encontrada!");
              return
            }
          }
      }else{
        setErro(true);
        setMensagemErro("Nenhuma Impressora encontrada!");
        return
      }
    } catch (error) {
      setErro(true);
      setMensagemErro("Erro ao buscar dispositivos pareados: " + error.getMessage);
      return
    } finally {
      setMensagemLoading("Buscando informações no servidor...")
      handleSubmit()//verifica se o smartphone está apto para enviar fichas
      if(!autorizado){
        return;
      }
      setLoading(false); // Terminar o carregamento
    }
  };

  useEffect(() => {
    changeKeepAwake(true);
    

    buscarDispositivos();
  }, []);

  const buscarPareadas = (pareados) =>{
    console.log("Buscando Impressoras pareadas...")
    const objeto = pareados.find(device => impressorasHabilitadas.includes(device.name));
    if(typeof objeto === "undefined"){//não encontrou nenhuma pareada
      return null;
    }else{
      console.log("Encontrou " + objeto.name)
      return objeto;
    }
  }
  const buscarNaoPareadas = (encontrados) =>{
    console.log("Buscando Impressoras não pareadas...")
    const objeto = encontrados.find(device => impressorasHabilitadas.includes(device.name));
    if(typeof objeto === "undefined"){//não encontrou nenhuma pareada
      return null;
    }else{
      console.log("Encontrou " + objeto.name)
      return objeto;
    }
  }
  const getFormattedDateTime = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  useEffect(() => {
    // Função assíncrona para conectar ao dispositivo
    const connectToPrinter = async () => {
      if (printer) {
        console.log("Conectando a: " + printer.name + ", Endereço: " + printer.address + " ...");
        try {
          await BluetoothManager.connect(printer.address);
          console.log("Conectado!");
        } catch (error) {
          console.error("Erro ao conectar:", error);
        }
      }
    };

    // Chama a função assíncrona
    connectToPrinter();
  }, [printer]);

  const print = async (json) => {
     try {
      await BluetoothEscposPrinter.setBlob(8);
      await  BluetoothEscposPrinter.printText(`${json.empresa['nomeFantasia']}\n\n`,{
        encoding:'GBK',
        codepage:0,
        widthtimes:0,
        heigthtimes:3,
        fonttype:2
      });
      await  BluetoothEscposPrinter.printText("SENHA:\n",{
        encoding:'GBK',
        codepage:0,
        widthtimes:1,
        heigthtimes:0,
        fonttype:1
      });
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.setBlob(5);
      await  BluetoothEscposPrinter.printText(`\n${json['identPrioridade'].toString()[0]}${json['numero'].toString().padStart(8, '0')}\n\n`,{
        encoding:'GBK',
        codepage:0,
        widthtimes:3,
        heigthtimes:3,
        fonttype:0
      });

      await BluetoothEscposPrinter.setBlob(2);

      await  BluetoothEscposPrinter.printText(getFormattedDateTime() + "\n\n",{
        encoding:'GBK',
        codepage:0,
        widthtimes:0,
        heigthtimes:0,
        fonttype:0
      });
      await  BluetoothEscposPrinter.printText("Siga @TaskTime\n\n\n",{
        encoding:'GBK',
        codepage:0,
        widthtimes:0,
        heigthtimes:0,
        fonttype:1
      });
     } catch (error) {
        console.error("Erro ao imprimir:", error);
     }
  };


  const handleRetry = () => {
    // Lógica para tentar novamente
    setErro(false);
    setLoading(true);
    buscarDispositivos();
  };

  return (
    <View style={styles.container}>
      {isErro ? (
        <View style={styles.containerError}>
        <Text style={styles.errorText}>{mensagemErro}</Text>
        <Button
          title="Tentar Novamente"
          onPress={() => {
            handleRetry()
          }}
        />
      </View>
      ) : loading ? (
        <>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>{mensagemLoading}</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Escolha seu atendimento:</Text>
          <TouchableOpacity style={[styles.button, styles.preferencialButton]} onPress={() =>solicitarFicha("PRIORITARIO")}>
            <Text style={styles.buttonText}>PREFERENCIAL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.normalButton]} onPress={() =>solicitarFicha("NORMAL")}>
            <Text style={styles.buttonText}>NORMAL</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingText: {
    marginTop: 10,
    fontSize: 20,
    color: '#333',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f4f4f4',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    width: '85%', // Largura do botão aumentada
    paddingVertical: 30, // Altura do botão aumentada
    borderRadius: 15, // Arredondamento mais pronunciado
    alignItems: 'center',
    marginVertical: 20,
  },
  preferencialButton: {
    backgroundColor: '#ff4d4d', // Vermelho
  },
  normalButton: {
    backgroundColor: '#4caf50', // Verde
  },
  buttonText: {
    color: 'white',
    fontSize: 26, // Aumenta o tamanho da label
    fontWeight: 'bold',
  },
  containerError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
  },
});

export default MyApp;
