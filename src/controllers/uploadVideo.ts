import path from "path"
import { promisify } from "util"
import fs from "fs"

import { bucket } from "../firebase/config"
import type { UploadPublishArgs } from "../types"

export async function uploadVideo({
  stationName,
  file,
  publishId,
}: UploadPublishArgs) {
  try {
    if (!file) throw { status: 400, message: "Bad request" }

    // Only process video file
    if (
      !file.mimetype.startsWith("video/") &&
      !file.mimetype.startsWith("application/octet-stream")
    ) {
      throw { status: 400, message: "Wrong file type" }
    }

    const filename = file.filename // with extension
    const inputFilePath = file.path

    // Upload the video to Cloud storage
    // Construct destination path for the image to be saved on cloud storage
    // Path will be in the form of `publishes/{station_name}/publishId/{filename}.mp4` and this is unique.
    const destinationParentPath = path.join("publishes", stationName, publishId)
    const videoContentDestination = path.join(destinationParentPath, filename)
    await bucket.upload(inputFilePath, {
      destination: videoContentDestination,
      resumable: true,
    })

    // Unlink temp files
    const unlink = promisify(fs.unlink)
    await unlink(inputFilePath)

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}
