"use client";
import { useRef, useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

const COLORS = ["#111827", "#DC2626", "#2563EB", "#16A34A", "#F59E0B"];

export default function Whiteboard({ unitWeekId, institutionId, userId, canClear }) {
  const supabase = createClient();
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const currentPoints = useRef([]);
  const [color, setColor] = useState(COLORS[0]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const drawStroke = (points, strokeColor) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
    }
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawAll = async () => {
    clearCanvas();
    const { data } = await supabase
      .from("whiteboard_strokes")
      .select("points, color")
      .eq("unit_week_id", unitWeekId)
      .order("created_at", { ascending: true });
    (data || []).forEach((s) => drawStroke(s.points, s.color));
  };

  useEffect(() => {
    if (!unitWeekId) return;
    redrawAll();

    const channel = supabase
      .channel(`whiteboard-${unitWeekId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whiteboard_strokes", filter: `unit_week_id=eq.${unitWeekId}` }, (payload) => {
        drawStroke(payload.new.points, payload.new.color);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "whiteboard_strokes", filter: `unit_week_id=eq.${unitWeekId}` }, () => {
        clearCanvas();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [unitWeekId]);

  const handleStart = (e) => {
    drawing.current = true;
    currentPoints.current = [getPos(e)];
  };

  const handleMove = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentPoints.current.push(pos);
    drawStroke(currentPoints.current.slice(-2), color);
  };

  const handleEnd = async () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentPoints.current.length < 2) return;
    await supabase.from("whiteboard_strokes").insert({
      unit_week_id: unitWeekId,
      institution_id: institutionId,
      user_id: userId,
      points: currentPoints.current,
      color,
    });
    currentPoints.current = [];
  };

  const handleClear = async () => {
    await supabase.from("whiteboard_strokes").delete().eq("unit_week_id", unitWeekId);
    clearCanvas();
  };

  return (
    <div className="paper p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full"
              style={{ background: c, border: color === c ? "2px solid var(--brand-color)" : "2px solid transparent" }}
            />
          ))}
        </div>
        {canClear && (
          <button onClick={handleClear} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border-soft)", color: "var(--text)" }}>
            Clear Board
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={450}
        className="w-full rounded-xl border touch-none"
        style={{ borderColor: "var(--border-soft)", background: "white", aspectRatio: "16/9" }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </div>
  );
}