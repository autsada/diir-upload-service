export type Environment = "development" | "test" | "production"
export type UploadFileArgs = {
  stationName: string
  file: Express.Multer.File
}

export type UploadPublishArgs = UploadFileArgs & {
  publishId: string
}
