import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destination = resolve(root, "public/models/pose_landmarker_lite.task");
const source =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const response = await fetch(source);
if (!response.ok) {
  throw new Error(
    `Could not download the Pose Landmarker model (${response.status} ${response.statusText}). ` +
      "Download the official model manually and save it as public/models/pose_landmarker_lite.task.",
  );
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, new Uint8Array(await response.arrayBuffer()));
console.log("Saved the Pose Landmarker model to public/models/pose_landmarker_lite.task.");
