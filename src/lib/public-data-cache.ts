import "server-only";
import { unstable_cache } from "next/cache";
import { getApprovedTestimoni, getClasses, getModules, getPublishedIndependentGameCounts } from "@/lib/db";

const readPublishedClasses = unstable_cache(() => getClasses(false), ["public-published-classes-v1"], { revalidate: 60, tags: ["public-classes"] });
const readPublishedModules = unstable_cache(() => getModules(false), ["public-published-modules-v1"], { revalidate: 60, tags: ["public-modules"] });
const readApprovedTestimonials = unstable_cache(() => getApprovedTestimoni(), ["public-approved-testimonials-v1"], { revalidate: 60 });
const readClassPracticeCounts = unstable_cache((classIds: string[]) => getPublishedIndependentGameCounts(classIds), ["public-class-practice-counts-v1"], { revalidate: 60, tags: ["public-class-practice-counts"] });

export const getPublicClasses = () => readPublishedClasses();
export const getPublicModules = () => readPublishedModules();
export const getPublicTestimonials = () => readApprovedTestimonials();
export const getPublicPracticeCounts = (classIds: string[]) => readClassPracticeCounts(classIds);
