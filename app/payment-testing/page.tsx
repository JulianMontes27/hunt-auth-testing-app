// import dynamic from "next/dynamic";
// Lazy loading in Next.js helps improve the initial loading performance of an application by decreasing the amount of JavaScript needed to render a route.
// It allows you to defer loading of Client Components and imported libraries, and only include them in the client bundle when they're needed. For example, you might want to defer loading a modal until a user clicks to open it.
// Next.js Dynamic Import allows loading components, pages, or modules asynchronously based on user interactions or conditions, optimizing performance by loading resources only when needed, enhancing application efficiency and user experience.
// Client Components:
// const MercadoPagoCheckout = dynamic(() => import("./mpc-checkout"), {
//   ssr: false,
// });

import MercadoPagoCheckout from "./mpc-checkout";

// Queremos que esta página sea dinámica para siempre poder ver la información actualizada del usuario
export const dynamic = "force-dynamic";

// The Client requests this *dynamic* page, which is server-rendered at request time
// In the future, we will need to implement a way to get the needed data to show the correct information for each request

// Rendering with search params
// In a Server Component page, you can access search parameters using the searchParams prop
// Using searchParams opts your page into dynamic rendering because it requires a incoming request to read the search parameters from.
// What to use and when: Use the searchParams prop when you need search parameters to load data for the page (e.g. pagination, filtering from a database).
export default async function TestingPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filters = (await searchParams).filters;

  // Log successful access for security monitoring
  console.log(filters);

  // For now, lets hardcode the bill amount for the Client to pay in the Mercado Pago Checkout
  return <MercadoPagoCheckout bill_amount={10000} />;
}
