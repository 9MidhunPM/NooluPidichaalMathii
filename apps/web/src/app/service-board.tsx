"use client";

import { useEffect, useState } from "react";
import { clockLabel, departures, istMinutes } from "./timetable";

type ServiceGraph = {
  lines: { id: string; name: string; color: string; service_status?: string }[];
  edges: { id: string; line_id: string; from_node_id: string; to_node_id: string }[];
  nodes: { id: string; name: string }[];
};

const notices = [
  "Mind the gap. Especially the one where the chutney fell.",
  "Please stand behind the yellow line. It is turmeric.",
  "Unattended baggage will be treated as a takeaway order.",
  "This is a gravy train. Some benefits may spill.",
  "No ticket? That's an un-fare breakfast.",
  "Please allow passengers to alight before you take a bite.",
  "Our network is carb-neutral. Our passengers are not.",
  "Doors closing. Keep your fingers and coconut out.",
  "Lost your way? We have a strand-by arrangement.",
  "Peak-hour crowding: too many cooks on the same track.",
  "The next stop is emotional support sambar.",
  "Service delayed: the driver has gone off the boil.",
  "Your connection is al dente. Please transfer promptly.",
  "Season tickets are valid for salt and pepper only.",
  "No running on platforms. A gentle simmer is permitted.",
  "Breakfast has a transport department now. You're welcome.",
];

export function ServiceBoard({ graph, names }: { graph: ServiceGraph; names: Map<string, string> }) {
  const [minute, setMinute] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setMinute(istMinutes(new Date()));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return <section className="service-board" aria-label="Fictional metro timetables">
    <p className="panel-kicker">NMRL DEPARTURE BOARD</p>
    <h3>A timetable nobody kneaded.</h3>
    <p className="simulation-label">NMRL simulation • IST • Daily fictional service</p>
    <p>Departures are from each service's starting point. Branches share a schedule; station arrival times are not predicted.</p>
    {graph.lines.map(line => {
      const serviceEdges = graph.edges.filter(edge => edge.line_id === line.id);
      const ids = new Set(serviceEdges.flatMap(edge => [edge.from_node_id, edge.to_node_id]));
      const stops = graph.nodes.filter(node => ids.has(node.id));
      const schedule = departures(line.id, minute ?? 0);
      const suspended = line.service_status === "suspended";
      return <details key={line.id} className="service-detail">
        <summary><span className="service-dot" style={{ background: line.color }} /><strong>{line.name}</strong><span>{suspended ? "Suspended" : `Every ${schedule.headway} min`}</span></summary>
        <dl><div><dt>First departure</dt><dd>{clockLabel(schedule.first)}</dd></div><div><dt>Last departure</dt><dd>{clockLabel(schedule.last)}</dd></div><div><dt>Stops served</dt><dd>{stops.length}</dd></div><div><dt>Runs</dt><dd>Daily</dd></div></dl>
        <p className="departure-times">{suspended ? "Service suspended — the noodle needs a lie-down." : minute === null ? "Loading local timetable…" : `${schedule.tomorrow ? "Tomorrow" : "Next departures"}: ${schedule.upcoming.map(clockLabel).join(" · ")}`}</p>
        <p className="stop-list">{stops.map(node => names.get(node.id) ?? node.name).join(" • ")}</p>
      </details>;
    })}
    <aside className="noodle-notice"><span>PUBLIC ANNOUNCEMENT / PLEASE REMAIN SAUCY</span><p>{notices[(minute ?? 0) % notices.length]}</p></aside>
    <details className="passenger-charter"><summary>The passenger char-teriyaki</summary><ul>{notices.filter((_, i) => i < 8).map(notice => <li key={notice}>{notice}</li>)}</ul></details>
  </section>;
}
