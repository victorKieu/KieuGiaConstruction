import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

export default async function PermissionsPage() {
    const supabase = createSupabaseServerClient()

  const [{ data: roles }, { data: permissions }, { data: users }] = await Promise.all([
    supabase.from("roles").select("*").order("name"),
    supabase.from("permissions").select("*").order("module, name"),
    supabase.from("users").select("*, roles(*)").order("name"),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quản lý phân quyền</h1>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roles">Vai trò</TabsTrigger>
          <TabsTrigger value="permissions">Quyền hạn</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/permissions/roles/new">
                <Plus className="w-4 h-4 mr-2" />
                Thêm vai trò mới
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách vai trò</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Tên vai trò</th>
                      <th className="text-left py-3 px-4 font-medium">Mô tả</th>
                      <th className="text-left py-3 px-4 font-medium">Số người dùng</th>
                      <th className="text-left py-3 px-4 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles?.map((role) => (
                      <tr key={role.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{role.name}</td>
                        <td className="py-3 px-4">{role.description || "-"}</td>
                        <td className="py-3 px-4">0</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/permissions/roles/${role.id}`}>Chi tiết</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {(!roles || roles.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          Chưa có vai trò nào. Hãy thêm vai trò mới!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/permissions/permissions/new">
                <Plus className="w-4 h-4 mr-2" />
                Thêm quyền mới
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách quyền hạn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Tên quyền</th>
                      <th className="text-left py-3 px-4 font-medium">Mã quyền</th>
                      <th className="text-left py-3 px-4 font-medium">Module</th>
                      <th className="text-left py-3 px-4 font-medium">Mô tả</th>
                      <th className="text-left py-3 px-4 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions?.map((permission) => (
                      <tr key={permission.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{permission.name}</td>
                        <td className="py-3 px-4">{permission.code}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {permission.module}
                          </span>
                        </td>
                        <td className="py-3 px-4">{permission.description || "-"}</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/permissions/permissions/${permission.id}`}>Chi tiết</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {(!permissions || permissions.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          Chưa có quyền nào. Hãy thêm quyền mới!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách người dùng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Tên người dùng</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">Vai trò</th>
                      <th className="text-left py-3 px-4 font-medium">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{user.name || "Chưa cập nhật"}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{user.role || "Chưa phân quyền"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.status === "active"
                              ? "Hoạt động"
                              : user.status === "inactive"
                                ? "Không hoạt động"
                                : user.status || "Không xác định"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/permissions/users/${user.id}`}>Phân quyền</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {(!users || users.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          Chưa có người dùng nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
