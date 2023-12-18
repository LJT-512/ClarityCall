import https from "https";
import dotenv from "dotenv";
dotenv.config();

export async function getTurnCredentials(req, res) {
  const o = { format: "urls" };
  const bodyString = JSON.stringify(o);
  const options = {
    host: "global.xirsys.net",
    path: "/_turn/MyFirstApp",
    method: "PUT",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.TURN_ACCOUNT_ID}:${process.env.TURN_SECRET}`
        ).toString("base64"),
      "Content-Type": "application/json",
      "Content-Length": bodyString.length,
    },
  };

  const httpreq = https.request(options, function (httpres) {
    let str = "";
    httpres.on("data", function (data) {
      str += data;
    });
    httpres.on("end", function () {
      try {
        const parsedData = JSON.parse(str);
        res.json(parsedData.v.iceServers);
      } catch (error) {
        console.error("Error parsing TURN credentials:", error);
        res.status(500).send("Error fetching TURN credentials");
      }
    });
  });

  httpreq.on("error", function (error) {
    console.error("Request error:", error);
    res.status(500).send("Error fetching TURN credentials");
  });
  httpreq.end(bodyString);
}
