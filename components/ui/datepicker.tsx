"use client"
import React, { useState } from "react"
import dayjs, { Dayjs } from "dayjs"

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date) => void
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const today = dayjs()
  const [selected, setSelected] = useState<Dayjs | null>(value ? dayjs(value) : null)
  const [month, setMonth] = useState((value ? dayjs(value) : today).month())
  const [year, setYear] = useState((value ? dayjs(value) : today).year())

  const startOfMonth = dayjs().year(year).month(month).startOf('month')
  const endOfMonth = dayjs().year(year).month(month).endOf('month')
  const daysInMonth = endOfMonth.date()
  const startDay = startOfMonth.day() // 0: Sunday

  // Build calendar grid
  let calendar: (number | null)[] = []
  for (let i = 0; i < startDay; i++) calendar.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendar.push(d)
  while (calendar.length % 7 !== 0) calendar.push(null)

  // Years options
  const years = []
  for (let y = today.year() - 90; y <= today.year() + 10; y++) years.push(y)

  const handlePick = (d: number | null) => {
    if (!d) return
    const picked = dayjs().year(year).month(month).date(d)
    setSelected(picked)
  }

  const handleConfirm = () => {
    if (selected && onChange) onChange(selected.toDate())
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 w-[350px] mx-auto">
      <div className="flex items-center mb-4">
        <div className="flex-1">
          <div className="text-2xl font-bold mb-1">Select Date</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-[#FFA726] rounded-xl flex flex-col items-center justify-center relative">
            <div className="absolute top-2 left-2 w-2 h-2 bg-orange-300 rounded-full"></div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-orange-300 rounded-full"></div>
            <div className="text-white text-3xl font-bold leading-none">
              {selected ? selected.format("DD") : today.format("DD")}
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="border rounded px-2 py-1 font-semibold"
        >
          {months.map((m, idx) => (
            <option value={idx} key={m}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border rounded px-2 py-1 font-semibold"
        >
          {years.map(y => (
            <option value={y} key={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-7 text-center mb-1 font-bold text-gray-400">
        <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
      </div>
      <div className="grid grid-cols-7 text-center mb-2">
        {calendar.map((d, i) => (
          <div
            key={i}
            className={
              `h-8 flex items-center justify-center rounded-lg cursor-pointer ` +
              (d
                ? (selected && selected.year() === year && selected.month() === month && selected.date() === d
                    ? "bg-[#FFA726] text-white font-bold"
                    : (today.year() === year && today.month() === month && today.date() === d
                        ? "text-[#FFA726] font-bold"
                        : "text-gray-800 hover:bg-orange-100"))
                : "text-gray-300"
              )
            }
            onClick={() => handlePick(d)}
          >
            {d ? d.toString().padStart(2, "0") : ""}
          </div>
        ))}
      </div>
      <button
        className="w-full bg-[#FFA726] hover:bg-[#fb9500] text-white rounded-lg py-2 font-semibold text-lg mt-2 transition"
        onClick={handleConfirm}
        disabled={!selected}
        type="button"
      >
        Confirm
      </button>
    </div>
  )
}