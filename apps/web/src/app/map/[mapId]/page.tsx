import type { ReactNode } from "react";

import HomePage from "../../page";

interface SharedMapPageProps {
  params: Promise<{ mapId: string }>;
}

export default async function SharedMapPage({ params }: SharedMapPageProps): Promise<ReactNode> {
  const { mapId } = await params;
  return <HomePage initialMapId={mapId} />;
}
