"use client";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Datum = { name: string; value: number };

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]; // blue, green, amber, red, violet, cyan

export default function DonutChart({ data, title, valueLabel }: { data: Datum[]; title?: string; valueLabel?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      {title ? <div className="mb-3"><h3 className="text-sm font-medium">{title}</h3></div> : null}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
              {data.map((_, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number | string) => [Number(value).toLocaleString(), valueLabel || "Value"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
