import fs from "fs";

import { FileActionResponse } from "../../interfaces";
import { isValidFilePath } from "../util";

export function readFileDir(file_path: string): FileActionResponse & { data?: string[] } {
  if (!isValidFilePath(file_path)) {
    return {
      error: true,
      message: "File name contains illegal characters",
    };
  }

  try {
    const data = fs.readdirSync(file_path, "utf8");
    return {
      error: false,
      message: "file read successfully",
      data: data,
    };
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      error: true,
      message: "Unable to read file",
    };
  }
}
