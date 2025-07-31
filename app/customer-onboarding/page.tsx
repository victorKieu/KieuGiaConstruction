'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/client';

export default function CustomerOnboardingPage() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [onboardingCompleted, setOnboardingCompleted] = useState(false);

    useEffect(() => {
        async function checkUserAndProfile() {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (!currentUser) {
                router.push('/login');
                return;
            }

            // Check email verification status
            if (currentUser.email_confirmed_at) {
                setIsEmailVerified(true);
            } else {
                setIsEmailVerified(false);
            }

            // Check if profile is already onboarded by trying to fetch existing data
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('phone, address') // Select fields you expect to be filled during onboarding
                .eq('id', currentUser.id)
                .single();

            if (customerError && customerError.code !== 'PGRST116') { // PGRST116 means no rows found (which is expected if not onboarded)
                console.error('Lỗi khi tải thông tin khách hàng:', customerError.message);
                setError('Có lỗi khi tải thông tin. Vui lòng tải lại trang.');
            } else if (customerData && customerData.phone && customerData.address) {
                // If data exists and essential fields are filled, assume onboarding is complete
                setOnboardingCompleted(true);
                setPhone(customerData.phone);
                setAddress(customerData.address);
            }
        }
        checkUserAndProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                checkUserAndProfile();
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [router]);

    useEffect(() => {
        if (onboardingCompleted && user && isEmailVerified) { // Chuyển hướng chỉ khi cả onboarding và email đã xác minh
            console.log('User đã hoàn thành onboarding và xác minh email, chuyển hướng tới trang chính.');
            router.push('/');
        } else if (onboardingCompleted && user && !isEmailVerified) {
            // Nếu onboarding đã xong nhưng email chưa xác minh, vẫn ở trang này hoặc chuyển đến trang confirm email.
            // Hiện tại chúng ta sẽ ở lại trang này để hiển thị thông báo email.
            console.log('User đã hoàn thành onboarding nhưng chưa xác minh email.');
        }
    }, [onboardingCompleted, user, isEmailVerified, router]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!user) {
            setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            setLoading(false);
            return;
        }

        // --- BỔ SUNG: CHỈNH SỬA LOGIC UPDATE NẾU CẦN THIẾT ---
        // Ở đây chúng ta vẫn dùng update, nhưng nó sẽ hoạt động nhờ chính sách RLS mới.
        const { data, error: updateError } = await supabase
            .from('customers')
            .update({
                phone: phone,
                address: address,
                // Add any other fields you want to update
            })
            .eq('id', user.id);

        setLoading(false);

        if (updateError) {
            console.error('Lỗi khi cập nhật thông tin khách hàng:', updateError.message);
            setError('Có lỗi xảy ra khi lưu thông tin. Vui lòng thử lại.');
        } else {
            console.log('Thông tin khách hàng đã được lưu thành công.');
            // Sau khi lưu thông tin, chuyển hướng đến trang xác nhận email
            router.push('/confirm-email');
        }
    };

    if (!user && !loading) {
        return <div className="flex min-h-screen items-center justify-center">Đang tải...</div>;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold">Hoàn tất thông tin tài khoản</h2>
                {!isEmailVerified && (
                    <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
                        <p className="font-bold">Xác minh Email của bạn!</p>
                        <p>Vui lòng kiểm tra hộp thư đến (và thư mục spam) để xác minh địa chỉ email của bạn.</p>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="phone">
                            Số điện thoại
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            className="w-full rounded border px-3 py-2 leading-tight text-gray-700 focus:border-blue-500 focus:outline-none"
                            placeholder="Nhập số điện thoại"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-bold text-gray-700" htmlFor="address">
                            Địa chỉ
                        </label>
                        <textarea
                            id="address"
                            className="w-full rounded border px-3 py-2 leading-tight text-gray-700 focus:border-blue-500 focus:outline-none"
                            placeholder="Nhập địa chỉ của bạn"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            rows={3}
                        />
                    </div>
                    {error && <p className="mb-4 text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700 focus:outline-none focus:shadow-outline"
                        disabled={loading}
                    >
                        {loading ? 'Đang lưu...' : 'Hoàn tất thông tin'}
                    </button>
                </form>
            </div>
        </div>
    );
}