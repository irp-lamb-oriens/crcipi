import ConsoleNav from "@/components/console/ConsoleNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ConsoleNav area="member" />
      {children}
    </>
  );
}
