"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
//import CreateProjectForm from "@/components/projects/create-project-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@supabase/supabase-js"; // Sử dụng createClient từ supabase-js
import { Card, CardHeader, CardFooter, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
//import { DatePicker } from "@/components/ui/datepicker" // Nếu bạn có DatePicker riêng, còn không dùng Input type="date"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); // Tạo client Supabase

interface CustomerTag {
    id: string
    name: string
}

interface User {
    id: string
    name: string
    email: string
}

export default function CustomerNewPage() {
    const [name, setName] = useState("")
    const [type, setType] = useState("individual") // cá nhân/doanh nghiệp
    const [contactPerson, setContactPerson] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [taxCode, setTaxCode] = useState("")
    const [birthday, setBirthday] = useState("")
    const [gender, setGender] = useState("unknown")
    const [status, setStatus] = useState("active")
    const [tag, setTag] = useState("all")
    const [ownerId, setOwnerId] = useState("none") // <-- sửa giá trị mặc định thành "none"
    const [note, setNote] = useState("")
    const [source, setSource] = useState("")
    const [website, setWebsite] = useState("")
    const [facebook, setFacebook] = useState("")
    const [zalo, setZalo] = useState("")
    const [avatarUrl, setAvatarUrl] = useState("")
    const [tags, setTags] = useState<CustomerTag[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    // Load tags và nhân viên phụ trách
    useEffect(() => {
        async function fetchData() {
            //const supabase = createClient()
            try {
                const { data: tagData } = await supabase.from("customer_tags").select("id, name").order("name")
                setTags(tagData || [])
            } catch { }
            try {
                const { data: userData } = await supabase.from("users").select("id, name, email").order("name")
                setUsers(userData || [])
            } catch { }
        }
        fetchData()
    }, [])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            //const supabase = createClient()
            const { error } = await supabase.from("customers").insert([{
                name,
                type,
                contact_person: contactPerson,
                email,
                phone,
                address,
                tax_code: taxCode,
                birthday: birthday || null,
                gender,
                status,
                tag_id: tag === "all" ? null : tag,
                owner_id: ownerId === "none" ? null : ownerId, // <-- sửa lại logic lưu
                note,
                source,
                website,
                facebook,
                zalo,
                avatar_url: avatarUrl
            }])
            if (error) throw error
            router.push("/crm/customers")
        } catch (err: any) {
            setError(err.message || "Có lỗi xảy ra khi lưu khách hàng.")
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Thêm khách hàng mới</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Tên khách hàng *</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="type">Loại khách hàng</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger id="type">
                                    <SelectValue placeholder="Chọn loại" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="individual">Cá nhân</SelectItem>
                                    <SelectItem value="company">Doanh nghiệp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="contactPerson">Người liên hệ chính</Label>
                            <Input id="contactPerson" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="phone">Số điện thoại</Label>
                            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="address">Địa chỉ</Label>
                            <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="taxCode">Mã số thuế</Label>
                            <Input id="taxCode" value={taxCode} onChange={e => setTaxCode(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="birthday">Ngày sinh / Ngày thành lập</Label>
                            <Input id="birthday" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="gender">Giới tính</Label>
                            <Select value={gender} onValueChange={setGender}>
                                <SelectTrigger id="gender">
                                    <SelectValue placeholder="Chọn giới tính" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Nam</SelectItem>
                                    <SelectItem value="female">Nữ</SelectItem>
                                    <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="status">Trạng thái</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Đang hoạt động</SelectItem>
                                    <SelectItem value="inactive">Không hoạt động</SelectItem>
                                    <SelectItem value="lead">Tiềm năng</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="tag">Nhãn</Label>
                            <Select value={tag} onValueChange={setTag}>
                                <SelectTrigger id="tag">
                                    <SelectValue placeholder="Chọn nhãn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Không chọn</SelectItem>
                                    {tags.map(tag => (
                                        <SelectItem key={tag.id} value={tag.id}>
                                            {tag.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="ownerId">Nhân viên phụ trách</Label>
                            <Select value={ownerId} onValueChange={setOwnerId}>
                                <SelectTrigger id="ownerId">
                                    <SelectValue placeholder="Chọn nhân viên" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Không chọn</SelectItem>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name || user.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="source">Nguồn khách hàng</Label>
                            <Input id="source" value={source} onChange={e => setSource(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input id="facebook" value={facebook} onChange={e => setFacebook(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="zalo">Zalo</Label>
                            <Input id="zalo" value={zalo} onChange={e => setZalo(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="avatarUrl">Ảnh đại diện (URL)</Label>
                            <Input id="avatarUrl" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="note">Ghi chú</Label>
                            <Textarea id="note" rows={2} value={note} onChange={e => setNote(e.target.value)} />
                        </div>
                        {error && (
                            <div className="text-red-500 text-sm md:col-span-2">{error}</div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button asChild variant="outline" type="button">
                            <Link href="/crm/customers">Hủy</Link>
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Đang lưu..." : "Lưu khách hàng"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}