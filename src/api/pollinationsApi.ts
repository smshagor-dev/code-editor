import axios, { AxiosInstance } from "axios"

const pollinationsBaseUrl = "https://text.pollinations.ai"

const instance: AxiosInstance = axios.create({
    baseURL: pollinationsBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
})

export default instance

//plln_sk_C3GmSZsBcmCGtl1EahAyF3maWwkcIaMd
