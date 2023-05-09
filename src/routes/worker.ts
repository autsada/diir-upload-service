import workerpool from "workerpool"

import { uploadVideo } from "../controllers/uploadVideo"

// create a worker and register public functions
workerpool.worker({
  uploadVideo,
})
