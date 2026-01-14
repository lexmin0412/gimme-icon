import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: "http://localhost:9588"
})

export const signIn = async () => {
    try {
        const data = await authClient.signIn.social({
            provider: "github"
        })
        return data
    } catch (error) {
        console.error("GitHub登录失败:", error)
        throw error
    }
}

export const signOut = async () => {
    try {
        await authClient.signOut()
    } catch (error) {
        console.error("退出登录失败:", error)
        throw error
    }
}