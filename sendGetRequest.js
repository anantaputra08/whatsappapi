import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { uploadFileToDirectory } from "./uploadFileToDirectory.js";

// Konversi import.meta.url ke __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;
export async function sendGetRequest(id, wappid, sender, setCaption) {
  const newurl = "https://graph.facebook.com/v18.0/" + id;
  try {
    const response = await axios.get(newurl, {
      headers: {
        Authorization: "Bearer " + GRAPH_API_TOKEN, // Add your Token to the header of the API request
      },
    });
    //if you want to see the response you get.
    // console.log(response);

    if (response.data && response.data.url) {
      //Get the Image Url
      const mediaURL = response.data.url;
      //Usually - lookaside.fb
      //Get the Image type, need it for saving in AWS S3

      const mediaMimeType = response.data.mime_type;

      // console.log(" Response from Graph V.18 - image: " + mediaURL);
      console.log(" Mime type: " + mediaMimeType);

      const result = await sendImgDownload(mediaURL, mediaMimeType, wappid, id, sender, setCaption);
      if (result.success === true){
        console.log("result pada sendGetRequest:", result);
        return result;
      } else {
        return result;
      }
    } else {
      console.log("Unexpected response format:", response.data);
    }
  } catch (error) {
    console.error("Error saving image from sendgetrequest:", error.message);
  }
  
}

export async function sendImgDownload(
  mediaURL,
  mediaMimeType,
  wappid,
  id,
  sender,
  setCaption
) {
  let filename = `WA_${id}`;
  let file_extension = "";
  let typeoffile = "";
  let somedata = "";

  console.log("setCaption di SendImage : ", setCaption);

  try {
    const response = await axios.get(mediaURL, {
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        "Content-Type": mediaMimeType,
      },
      responseType: "arraybuffer", // This is important for binary data
    });

    // Check if the response contains data
    if (response.data) {
      // Splitting the mimetype to save in AWS
      if (
        mediaMimeType.startsWith("image/") ||
        mediaMimeType.startsWith("video/")
      ) {
        const ext = mediaMimeType.split("/")[1];
        file_extension = `${filename}.${ext}`;
        typeoffile = mediaMimeType.split("/")[0];
        somedata = Buffer.from(response.data, "binary");

        // Create 'assets' directory if it doesn't exist
        const assetsDir = path.join(__dirname, "assets");
        if (!fs.existsSync(assetsDir)) {
          fs.mkdirSync(assetsDir);
        }

        // Full path to save the file
        const filePath = path.join(assetsDir, file_extension);

        // Save the binary data to the file in the 'assets' directory
        fs.writeFileSync(filePath, somedata);

        // Send the file to the specified URL directory
        const result = await uploadFileToDirectory(filePath, sender, setCaption);
        if (result.success === true) {
          console.log(`Media saved to ${filePath} successfully. Pada sendImgDownload`);
          // return result; // Mengembalikan respons sukses
        } else {
          console.error("Error uploading file:", result.message);
          // return result; // Mengembalikan respons error
        }
        return result; // Mengembalikan respons sukses
      } else {
        console.error("Unsupported media type:", mediaMimeType);
      }
    } else {
      console.error("Empty response data received.");
    }
  } catch (error) {
    console.error("Error sending to AWS:", error.message);
  }
}
