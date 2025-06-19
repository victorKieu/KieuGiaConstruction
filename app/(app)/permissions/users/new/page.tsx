"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useActivityLogger } from "@/lib/auth/use-activity-logger"

export default function NewUserPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tempPassword, setTempPassword] = useState("")
  const router = useRouter()
  const { logActivity } = useActivityLogger()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi tạo người dùng")
      }

      setTempPassword(data.temporaryPassword)
      setSuccess(true)

      // Ghi log hoạt động
      await logActivity({
        action: "create",
        entityType: "user",
        entityId: data.user.id,
        details: { email, name, role },
      })
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err);
        }
    } finally {
      setLoading(false)
    }
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tạo người dùng mới</h1>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin người dùng</CardTitle>
            <CardDescription>Nhập thông tin để tạo tài khoản người dùng mới</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <div className="space-y-4">
                <Alert className="mb-4">
                  <AlertDescription>
                    Người dùng đã được tạo thành công! Mật khẩu tạm thời là: {tempPassword}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Nhập email"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Tên</Label>
                  <Input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Nhập tên"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Vai trò</Label>
                  <Select onValueChange={setRole} defaultValue={role}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo người dùng
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}
