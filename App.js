import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import {BluetoothManager,BluetoothEscposPrinter,BluetoothTscPrinter} from 'react-native-bluetooth-escpos-printer';
import KeepAwake from 'react-native-keep-awake';

const MyApp = () => {
  const [printer, setPrinter] = useState(undefined);
  const [loading, setLoading] = useState(true); // Estado para o carregamento
  const impressorasHabilitadas = ["MPT-II", "MPT-III", "MPT-XS"];

  function changeKeepAwake(shouldBeAwake) {
    if (shouldBeAwake) {
      KeepAwake.activate();
    } else {
      KeepAwake.deactivate();
    }
  }

  useEffect(() => {
    changeKeepAwake(true);
    const buscarDispositivos = async () => {
      try {
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
                  console.log("Nenhuma Impressora encontrada!")
                }
              }else{
                console.log("Nenhuma Impressora encontrada!")
              }
            }
        }else{
          console.log("Nenhuma Impressora encontrada!")
        }
      } catch (error) {
        console.log('Erro ao buscar dispositivos pareados:', error);
      } finally {
        setLoading(false); // Terminar o carregamento
      }
    };

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

  const print = async () => {
     try {
      let ficha = "N00005135";
      await BluetoothEscposPrinter.setBlob(8);
      await  BluetoothEscposPrinter.printText("Lojas Havan Pelotas\n\n",{
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
      await  BluetoothEscposPrinter.printText(`\n${ficha}\n\n\n`,{
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
      await  BluetoothEscposPrinter.printText("Siga @TaskTime\n\n\n\n",{
        encoding:'GBK',
        codepage:0,
        widthtimes:0,
        heigthtimes:0,
        fonttype:1
      });
      console.log(ficha)
     } catch (error) {
        console.error("Erro ao imprimir:", error);
     }
  };

  const printHelloWorld = async () => {
    if (!printer) {
      console.warn("Nenhuma impressora conectada.");
      return;
    }

    try {
      print(); // Parâmetros opcionais
    } catch (error) {
      console.error("Erro ao imprimir: ", error);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#00BCD4" />
          <Text style={styles.loadingText}>Buscando Impressora...</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Escolha seu atendimento:</Text>
      
          <TouchableOpacity style={[styles.button, styles.preferencialButton]}>
            <Text style={styles.buttonText}>PREFERENCIAL</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.normalButton]}>
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
});

export default MyApp;
