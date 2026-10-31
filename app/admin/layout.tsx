import ConsoleNav from "@/components/console/ConsoleNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConsoleNav area="admin" />
      {children}
    </>
  );
}
