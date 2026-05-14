import { useState, useEffect } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://nxkyrkemwralvkdhtocl.supabase.co";
const SUPABASE_KEY = "sb_publishable_mna2WG_S3ojW1t0MRgMFKQ_YRwe6usF";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DAYS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
const SHIFTS = [
  { value: "am", label: "早班", sub: "09:00–15:00" },
  { value: "pm", label: "午班", sub: "15:00–21:00" },
  { value: "off", label: "休假", sub: "" },
];

const NOW = new Date();
const YEAR_MONTH = `${NOW.getFullYear()}-${String(NOW.getMonth() + 2).padStart(2, "0")}`;
const MONTH_LABEL = `${NOW.getMonth() + 2}月`;

const COLORS = ["#C8E6FA", "#C8F0E6", "#FAE0C8", "#E8C8FA", "#FAC8D4"];
const TEXT_COLORS = ["#0C447C", "#085041", "#633806", "#3C3489", "#791F1F"];

export default function App() {
  const [view, setView] = useState("login");
  const [role, setRole] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [availability, setAvailability] = useState({});
  const [allAvailability, setAllAvailability] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("availability");

  // Initialize default availability
  const defaultAvailability = () => {
    const d = {};
    DAYS.forEach((_, i) => { d[i + 1] = "off"; });
    return d;
  };

  useEffect(() => {
    if (role === "boss") {
      fetchEmployees();
      fetchAllAvailability();
      fetchSchedules();
    }
  }, [role]);

  async function fetchEmployees() {
    const { data } = await supabase.from("員工").select("*").eq("is_active", true);
    if (data) setEmployees(data);
  }

  async function fetchAllAvailability() {
    const { data } = await supabase.from("員工填寫的可用時間").select("*, 員工(name, type)").eq("year_month", YEAR_MONTH);
    if (data) setAllAvailability(data);
  }

  async function fetchSchedules() {
    const { data } = await supabase.from("預排的班表").select("*, 員工(name)").eq("status", "published");
    if (data) setSchedules(data);
  }

  async function fetchEmployeeAvailability(empId) {
    const { data } = await supabase.from("員工填寫的可用時間").select("*").eq("employee_id", empId).eq("year_month", YEAR_MONTH);
    if (data && data.length > 0) {
      const d = {};
      data.forEach(row => { d[row.day_of_week] = row.shift; });
      setAvailability(d);
    } else {
      setAvailability(defaultAvailability());
    }
  }

  async function handleLogin() {
    setError("");
    if (loginPin === "boss1234") {
      setRole("boss");
      setView("boss");
      return;
    }
    const { data } = await supabase.from("員工").select("*").ilike("name", loginName.trim()).eq("is_active", true).single();
    if (data) {
      setEmployee(data);
      setRole("employee");
      await fetchEmployeeAvailability(data.id);
      setView("employee");
    } else {
      setError("找不到員工，請確認姓名");
    }
  }

  async function saveAvailability() {
    setSaving(true);
    const rows = Object.entries(availability).map(([day, shift]) => ({
      employee_id: employee.id,
      store_id: employee.store_id,
      year_month: YEAR_MONTH,
      day_of_week: parseInt(day),
      shift,
    }));
    await supabase.from("員工填寫的可用時間").delete().eq("employee_id", employee.id).eq("year_month", YEAR_MONTH);
    await supabase.from("員工填寫的可用時間").insert(rows);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function checkLabor(empId) {
    const empSchedules = schedules.filter(s => s.employee_id === empId);
    const warnings = [];
    let consecutive = 0;
    let maxConsecutive = 0;
    let weekHours = 0;
    empSchedules.forEach(s => {
      if (s.shift !== "off") {
        consecutive++;
        weekHours += 6;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
      } else {
        consecutive = 0;
      }
    });
    if (maxConsecutive >= 6) warnings.push("連續上班超過6天");
    if (weekHours > 40) warnings.push(`本月週平均工時 ${Math.round(weekHours / 4)} 小時，超過40小時`);
    return warnings;
  }

  // LOGIN VIEW
  if (view === "login") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--color-background-tertiary)" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>排班系統</h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>請輸入你的姓名登入</p>
          </div>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "1.5rem" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>姓名</label>
              <input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="例：陳小明" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 15, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>PIN碼（老闆用）</label>
              <input value={loginPin} onChange={e => setLoginPin(e.target.value)} type="password" placeholder="員工不需要輸入" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", fontSize: 15, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            {error && <div style={{ fontSize: 13, color: "#A32D2D", marginBottom: 12 }}>{error}</div>}
            <button onClick={handleLogin} style={{ width: "100%", padding: "11px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>登入</button>
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 16 }}>員工只需輸入姓名，老闆需要 PIN 碼</p>
        </div>
      </div>
    );
  }

  // EMPLOYEE VIEW
  if (view === "employee") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>你好，{employee?.name}</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{MONTH_LABEL}可用時間填寫</p>
          </div>
          <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: employee?.type === "full_time" ? "#E6F1FB" : "#E1F5EE", color: employee?.type === "full_time" ? "#0C447C" : "#085041" }}>
            {employee?.type === "full_time" ? "全職" : "兼職"}
          </span>
        </div>

        <div style={{ background: "#FAEEDA", borderRadius: 10, padding: "10px 14px", marginBottom: "1.5rem", fontSize: 13, color: "#633806" }}>
          ⏰ 請在截止日前填寫完畢。填寫後可修改。
        </div>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, overflow: "hidden", marginBottom: "1rem" }}>
          {DAYS.map((day, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < 6 ? "0.5px solid var(--color-border-tertiary)" : "none", gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, width: 36, color: "var(--color-text-primary)" }}>{day}</span>
              <div style={{ display: "flex", gap: 6, flex: 1 }}>
                {SHIFTS.map(shift => {
                  const selected = availability[i + 1] === shift.value;
                  let bg = "transparent", color = "var(--color-text-secondary)", border = "0.5px solid var(--color-border-tertiary)";
                  if (selected && shift.value === "am") { bg = "#FAEEDA"; color = "#633806"; border = "0.5px solid #FAC775"; }
                  if (selected && shift.value === "pm") { bg = "#E6F1FB"; color = "#0C447C"; border = "0.5px solid #B5D4F4"; }
                  if (selected && shift.value === "off") { bg = "var(--color-background-secondary)"; color = "var(--color-text-secondary)"; border = "0.5px solid var(--color-border-secondary)"; }
                  return (
                    <button key={shift.value} onClick={() => setAvailability(prev => ({ ...prev, [i + 1]: shift.value }))}
                      style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border, background: bg, color, fontSize: 12, cursor: "pointer", fontWeight: selected ? 500 : 400, transition: "all 0.1s" }}>
                      <div>{shift.label}</div>
                      {shift.sub && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{shift.sub}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={saveAvailability} disabled={saving}
          style={{ width: "100%", padding: 13, borderRadius: 10, background: saved ? "#1D9E75" : "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 15, fontWeight: 500, cursor: "pointer", transition: "background 0.3s" }}>
          {saving ? "儲存中..." : saved ? "✓ 已儲存" : "送出可用時間"}
        </button>

        <button onClick={() => setView("login")} style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 10, background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer" }}>
          登出
        </button>
      </div>
    );
  }

  // BOSS VIEW
  if (view === "boss") {
    const notFilled = employees.filter(e => !allAvailability.find(a => a.employee_id === e.id));
    const filledCount = employees.filter(e => allAvailability.find(a => a.employee_id === e.id)).length;

    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>排班管理</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{MONTH_LABEL}班表</p>
          </div>
          <button onClick={() => setView("login")} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>登出</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: "1.5rem" }}>
          {[
            { label: "員工總數", value: employees.length, sub: `全職 ${employees.filter(e => e.type === "full_time").length} / 兼職 ${employees.filter(e => e.type === "part_time").length}` },
            { label: "已填可用時間", value: filledCount, sub: `還差 ${notFilled.length} 人` },
            { label: "勞基警示", value: employees.reduce((acc, e) => acc + checkLabor(e.id).length, 0), sub: "項需注意", danger: true },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "14px" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: s.danger && s.value > 0 ? "#A32D2D" : "var(--color-text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {notFilled.length > 0 && (
          <div style={{ background: "#FCEBEB", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#791F1F", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span>⚠</span>
            <span>{notFilled.map(e => e.name).join("、")} 尚未填寫可用時間</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: "1.5rem" }}>
          {[["availability", "可用時間"], ["schedule", "排班表"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: "8px 16px", fontSize: 14, cursor: "pointer", border: "none", background: "none", color: activeTab === key ? "var(--color-text-primary)" : "var(--color-text-secondary)", borderBottom: activeTab === key ? "2px solid var(--color-text-primary)" : "2px solid transparent", fontWeight: activeTab === key ? 500 : 400, marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "availability" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>員工 {MONTH_LABEL} 可用時間</div>
            {employees.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
                尚無員工資料。請先在 Supabase 的 employees 表格新增員工。
              </div>
            )}
            {employees.map((emp, idx) => {
              const empAvail = allAvailability.filter(a => a.employee_id === emp.id);
              const warnings = checkLabor(emp.id);
              const bg = COLORS[idx % COLORS.length];
              const tc = TEXT_COLORS[idx % TEXT_COLORS.length];
              return (
                <div key={emp.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: empAvail.length ? 12 : 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, color: tc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
                      {emp.name.slice(0, 1)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{emp.name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{emp.type === "full_time" ? "全職" : "兼職"}</div>
                    </div>
                    {empAvail.length === 0 ? (
                      <span style={{ fontSize: 12, color: "#A32D2D", background: "#FCEBEB", padding: "3px 10px", borderRadius: 999 }}>未填</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#085041", background: "#E1F5EE", padding: "3px 10px", borderRadius: 999 }}>已填</span>
                    )}
                  </div>
                  {empAvail.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {DAYS.map((day, i) => {
                        const a = empAvail.find(x => x.day_of_week === i + 1);
                        const shift = a?.shift || "off";
                        let sbg = "var(--color-background-secondary)", sc = "var(--color-text-tertiary)";
                        if (shift === "am") { sbg = "#FAEEDA"; sc = "#633806"; }
                        if (shift === "pm") { sbg = "#E6F1FB"; sc = "#0C447C"; }
                        return (
                          <div key={i} style={{ background: sbg, color: sc, fontSize: 11, padding: "4px 8px", borderRadius: 6, textAlign: "center" }}>
                            <div>{day}</div>
                            <div style={{ fontWeight: 500 }}>{shift === "am" ? "早" : shift === "pm" ? "午" : "休"}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {warnings.length > 0 && (
                    <div style={{ marginTop: 10, background: "#FAEEDA", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#633806" }}>
                      ⚠ {warnings.join("、")}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={() => { fetchEmployees(); fetchAllAvailability(); }}
              style={{ width: "100%", marginTop: 4, padding: 11, borderRadius: 10, background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer" }}>
              重新整理
            </button>
          </div>
        )}

        {activeTab === "schedule" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>已發布的班表</div>
            {schedules.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14, background: "var(--color-background-secondary)", borderRadius: 12 }}>
                尚無已發布的班表。<br />
                <span style={{ fontSize: 12, marginTop: 8, display: "block" }}>請在 Supabase 的 schedules 表格新增排班資料，status 設為 published</span>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "var(--color-text-secondary)", fontWeight: 400, borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>員工</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 400, borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>日期</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", color: "var(--color-text-secondary)", fontWeight: 400, borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 12 }}>班次</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(s => (
                      <tr key={s.id}>
                        <td style={{ padding: "10px 10px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)" }}>{s.employees?.name}</td>
                        <td style={{ padding: "10px 6px", textAlign: "center", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)" }}>{s.date}</td>
                        <td style={{ padding: "10px 6px", textAlign: "center", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: s.shift === "am" ? "#FAEEDA" : s.shift === "pm" ? "#E6F1FB" : "var(--color-background-secondary)", color: s.shift === "am" ? "#633806" : s.shift === "pm" ? "#0C447C" : "var(--color-text-secondary)" }}>
                            {s.shift === "am" ? "早班" : s.shift === "pm" ? "午班" : "休假"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
