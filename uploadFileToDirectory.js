import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export async function uploadFileToDirectory(filePath, sender, setCaption) {
  const url = "https://anantaputra123.000webhostapp.com/upload.php";
  
  //membuat formData untuk variabel yang dikirim ke server php
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath)); // membaca file foto yang ada pada server glitch
  form.append("sender", sender); // Menambahkan parameter sender ke form data
  form.append("setCaption", setCaption);

  try {
    const result = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
      },
    });
    // Access the data property of the response
    const responseData = result.data;
    
    //kondisi untuk reponse dari server php
    if (responseData.success === true){
      console.log(`responseData: `,responseData);
    } else {
      console.error(`kesalahan upload foto ke server php: ${responseData.message}`);
    }
    // Mengembalikan respons dari server
    return responseData; 
  } catch (error) {
    console.error(`Error on catch uploadFileToDirectory.js: ${error.message}`);
  }
}
