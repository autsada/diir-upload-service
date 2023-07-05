import path from "path"
import { promisify } from "util"
import fs from "fs"
import axios from "axios"
import { authClient } from "../authClient"
import type { Environment } from "../types"

const { NODE_ENV, GATEWAY_SERVICE_URL, UPLOAD_SIGNATURE } = process.env

const env = NODE_ENV as Environment

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

/**
 * @param publishRef is a directory that contains the publish's files, it is in the format `publishes/<name>/<publish_id>/`
 * @returns
 */
export async function deleteFiles(publishRef: string) {
  try {
    if (!publishRef) throw { status: 400, message: "Bad request" }

    // Add try/catch so if there is an error here the code will still continue
    try {
      await bucket.deleteFiles({
        prefix: publishRef,
      })
    } catch (error) {
      console.error(error)
    }

    // Call the Gateway Service webhook to delete the publish in the database.
    const baseURL =
      env === "development" ? "http://localhost:4000" : GATEWAY_SERVICE_URL!
    const token =
      env === "development" ? "" : await authClient.getIdToken(baseURL)

    // 1. Get a publish id from the publishRef --> "publishes/<name>/<publish_id>/"
    const refs = publishRef.split("/")
    const publishId = refs.length > 2 ? refs[refs.length - 2] : ""
    await axios({
      method: "DELETE",
      url: `${baseURL}/webhooks/publishes/${publishId}`,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "upload-signature": UPLOAD_SIGNATURE || "",
      },
    })

    return { status: "Ok" }
  } catch (error) {
    throw error
  }
}
