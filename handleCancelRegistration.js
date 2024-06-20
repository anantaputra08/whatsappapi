import fetch from "node-fetch";
import querystring from "querystring";

export async function handleCancelRegistration(data, message) {
  const { sender, keyword, poliklinik, no_kartu_pasien, timestamp } = data;

  const replyMessage = `Batal Poliklinik ${poliklinik.toUpperCase()} \nNo. Pasien ${no_kartu_pasien} berhasil!`;
  const replyMessageNotRegistered = `No. Pasien ${no_kartu_pasien} \nBelum terdaftar dipoliklinik manapun!`;
  const replyMessageIsRegistered = `No. Pasien ${no_kartu_pasien} bukan terdaftar di Poliklinik ${poliklinik.toUpperCase()}, tetapi di Poliklinik `;
  const replyMessageError = 
        `Kesalahan penggunaan kewyord *BATAL*\n`+
        '*CONTOH :*\n'+
        'BATAL#POLIKLINIK#NO.PASIEN';
  
  if (!poliklinik || !no_kartu_pasien) {
      return replyMessageError;
    }

  const queryParams = {
    sender,
    keyword,
    poliklinik,
    no_kartu_pasien,
    timestamp,
  };

  const url = `https://anantaputra123.000webhostapp.com/handleCancelRegistration.php?${querystring.encode(queryParams)}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
    });
    const responseText = await response.text();
    console.log(responseText)
    console.log("Data berhasil dikirim");
    if (responseText.trim() === "Data berhasil dihapus dari database") {
      return replyMessage;
    } else if (responseText.startsWith("Pasien sudah terdaftar di poliklinik|")) {
      const [_, poliklinik] =
        responseText.split("|");
      return replyMessageIsRegistered + `${poliklinik.toUpperCase()}`;
    } else if (responseText.trim() === "Data tidak ditemukan") {
      return replyMessageNotRegistered;
    }else {
      console.error("Terjadi kesalahan saat mengirim data");
    }
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  }
}
