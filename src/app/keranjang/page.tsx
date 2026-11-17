import ClassCartClient from "@/components/ClassCartClient";
import { getClasses } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function CartPage() { return <ClassCartClient classes={await getClasses(false)}/>; }
