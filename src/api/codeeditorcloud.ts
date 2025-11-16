import axios, { AxiosInstance } from "axios"

const codeeditorcloudBaseUrl = "https://cloud.code-editor.ru/api"

const codeeditorcloudInstance: AxiosInstance = axios.create({
    baseURL: codeeditorcloudBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout: 30000, 
})

export default codeeditorcloudInstance