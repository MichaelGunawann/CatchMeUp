import { ProductApp } from "@/components/product-app";

type PageProps = {
  params: Promise<{
    path?: string[];
  }>;
};

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return <ProductApp path={resolvedParams.path ?? []} />;
}
