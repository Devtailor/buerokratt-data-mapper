import fs from "fs";
import mime from "mime-types";

export default async function readFile(file_path, res) {
  if (!file_path) {
    res.status(400).contentType("text/plain").send("File path is required");
    return;
  }

  if (file_path.includes("..")) {
    res
      .status(400)
      .contentType("text/plain")
      .send("Relative paths are not allowed");
    return;
  }
  const mimeType = mime.lookup(file_path);
  const name = file_path.split(/[\\/]/g).pop();

  fs.readFile(file_path, "utf8", (err, data) => {
    if (err) {
      res.status(404).send("File not found");
      return;
    }
    const file = Buffer.from(data).toString("base64");

    res.setHeader("Content-Type", "application/json; charset=utf8");

    const result = {
      name: name,
      file: file,
      mimeType: mimeType,
    };
    res.json(result);
  });
}
