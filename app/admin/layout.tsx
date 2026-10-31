import ConsoleNav from "@/components/console/ConsoleNav";
import styles from "@/components/console/Console.module.scss";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.frame}>
      <ConsoleNav area="admin" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
