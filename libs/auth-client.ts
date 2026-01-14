import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient()

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