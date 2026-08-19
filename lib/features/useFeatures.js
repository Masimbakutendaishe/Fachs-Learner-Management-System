import { useAuth } from "../../pages/context/AuthContext";
import { getFeatures } from "./index";

export function useFeatures() {
  const { institution } = useAuth();
  return getFeatures(institution);
}