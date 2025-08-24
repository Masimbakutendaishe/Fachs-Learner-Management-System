"use client";
import { useRouter } from "next/router";
import ModulePlayer from "../../components/ModulePlayer";

export default function ModulePlayerPage() {
  const router = useRouter();
  const { enrollmentId } = router.query;

  if (!enrollmentId) return <p className="p-6 text-center">Loading...</p>;

  return <ModulePlayer enrollmentId={enrollmentId} />;
}
