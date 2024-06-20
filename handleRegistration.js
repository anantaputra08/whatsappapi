import fetch from "node-fetch";
import querystring from "querystring";

export async function handleRegistration(data, message) {
  //menguraikan data dari parameter function
  const { sender, keyword, poliklinik, no_kartu_pasien, timestamp } = data;

  const replyMessageSuccess = `Pendaftaran Poliklinik ${poliklinik.toUpperCase()} dengan :`;
  const replyMessageAlreadyRegistered = `No. Pasien ${no_kartu_pasien} sudah terdaftar di Poliklinik`;
  const replyMessagePasienNotRegistered = 
        `Pasien dengan No. Pasien ${no_kartu_pasien} belum terdaftar silahkan mendaftar terlebih dahulu!\n`+
        '*CONTOH :*\n'+
        'masih proses';
  const replyBpjsDocuments = 
        `Silahkan mengirimkan foto KTP, BPJS, Rujukan!\n`+
        `Dengan keyword :\n`+
        `*KTP* untuk mengirim foto KTP\n`+
        `*BPJS* untuk mengirim foto BPJS\n`+
        `*Rujukan* untuk mengirim surat rujukan!`;
  const replyUmumDocuments = 
        `Silahkan mengirimkan foto KTP dan melakukan pembayaran dengan transfer ke\n`+
        `*No. Rekening A/N*\n`+
        `*Ananta Putra*\n`+
        `091008756\n`+
        `Dengan keyword :\n`+
        `*KTP* untuk mengirim foto KTP\n`+
        `*BAYAR* untuk mengirim bukti bayar!`;
  const replyMessageError = 
        `Kesalahan penggunaan kewyord *DAFTAR*\n`+
        '*CONTOH :*\n'+
        '\nDAFTAR#POLIKLINIK#NO.PASIEN';
  let replyMessage = ``;
  
  //kondisi jika kwyword tidak sesuai atau tidak ada poliklinik atau nomor pasien
  if (!poliklinik || !no_kartu_pasien || isNaN(no_kartu_pasien)){
      return replyMessageError;
    }

  //membuat model parameternya
  const queryParams = {
    sender,
    keyword,
    poliklinik,
    no_kartu_pasien,
    timestamp,
  };

  //membuat const untuk url dengan parameternya
  const url = `https://anantaputra123.000webhostapp.com/handleRegistration.php?${querystring.encode(
    queryParams
  )}`;

  //try untuk mencoba apakah bisa dijalankan
  try {
    //const reponse untuk menunggu hasil atau response dari server php dengan metode post
    const response = await fetch(url, {
      method: "POST",
    });

    //const response text untuk mengambil nilai text pada response
    const responseText = await response.text();
    console.log(responseText);
    //response text dengan awalan
    if (responseText.startsWith("Data berhasil disimpan|")) {
      
      //mengambil value dari echo yang ditampilkan dan dimasukan ke const dengan pembatas "|"
      const [_, nm_pasien, no_ktp, tmp_lahir, tgl_lahir, kd_pj, no_urut] =
        responseText.split("|");
      
      //jika layanan pasien UMUM
      if (kd_pj === "UMU"){
        replyMessage = 
          `${replyMessageSuccess}\n`+
          `No. Pasien\t: ${no_kartu_pasien}\n`+
          `Nama\t\t: ${nm_pasien}\n`+
          `No. KTP\t\t: ${no_ktp}\n`+
          `Tempat Lahir\t: ${tmp_lahir}\n`+
          `Tanggal Lahir\t: ${tgl_lahir}\n`+
          `Kode PJ\t\t: ${kd_pj}\n`+
          `Nomor urut\t: ${no_urut}\n`+
          `*Telah Berhasil!*\n`+
          `------------------\n`+
          `${replyUmumDocuments}`;
        return replyMessage;
        
      //jika layanan pasien BPJS
      } else if (kd_pj === "BPJ"){
        replyMessage = 
          `${replyMessageSuccess}\n`+
          `No. Pasien\t: ${no_kartu_pasien}\n`+
          `Nama\t\t: ${nm_pasien}\n`+
          `No. KTP\t\t: ${no_ktp}\n`+
          `Tempat Lahir\t: ${tmp_lahir}\n`+
          `Tanggal Lahir\t: ${tgl_lahir}\n`+
          `Kode PJ\t\t: ${kd_pj}\n`+
          `Nomor urut\t: ${no_urut}\n`+
          `*Telah Berhasil!*\n`+
          `------------------\n`+
          `${replyBpjsDocuments}`;
        return replyMessage;
      }
      
      //mengembalikan untuk reply message
      // return `${replyMessageSuccess}\nNama: ${nm_pasien}\nNo. KTP: ${no_ktp}\nTempat Lahir: ${tmp_lahir}\n`+
      //   `Tanggal Lahir: ${tgl_lahir}\nKode PJ: ${kd_pj}\nDengan Nomor urut: ${no_urut}\ntelah berhasil!`;
      
      //jika pasein sudah terdaftar pada salah satu poliklinik
    } else if (responseText.startsWith("Data sudah ada|")) {
      
      //mengambil value dari echo yang ditampilkan dan dimasukan ke const dengan pembatas "|"
      const [_, poliklinikDb, nm_pasien, no_ktp, tmp_lahir, tgl_lahir, kd_pj, no_urut] =
        responseText.split("|");
      
      //mengembalikan untuk reply message
      return `${replyMessageAlreadyRegistered} ${poliklinikDb.toUpperCase()}\nNama: ${nm_pasien}\nNo. KTP: ${no_ktp}\n`+
        `Tempat Lahir: ${tmp_lahir}\nTanggal Lahir: ${tgl_lahir}\nKode PJ: ${kd_pj}\nDengan Nomor urut: ${no_urut}`;
      
    //jika response text sama dengan pasien belum terdaftar
    } else if (responseText === "Pasien belum terdaftar") {
      
      //return dengan pasien not registered
      return replyMessagePasienNotRegistered;
    //jika kesalahan saat mengirim data dari server php
    } else {
      console.error("Terjadi kesalahan saat mengirim data");
    }
  // catch error jika tidak dapat mengirim data ke server php
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  }
}
