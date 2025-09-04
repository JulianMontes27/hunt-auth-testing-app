import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import UserButton from "@/components/user-button";

// Queremos que esta página sea dinámica para saber el estado del marketplace
export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  // console.log("Cookie header:", cookieStore);
  // Check if User is authed
  const session = await fetch(
    // "https://hunt-auth-v3.onrender.com/api/auth/validate",
    "http://localhost:3000/api/auth/validate",
    {
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStore.toString(),
      },
    }
  );

  const responseData = await session.json().catch(() => null);

  if (!responseData?.authenticated) {
    console.log(responseData);
    redirect("http://localhost:3000/sign-in?redirect=http://localhost:3001");
  }

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div className="text-center">
        <h1 className="text-2xl mb-4">Estas autenticado.</h1>
        <UserButton />
      </div>
      <div>Conecta tu cuenta de Mercadopago para activar tu marketplace</div>
    </div>
  );
}
