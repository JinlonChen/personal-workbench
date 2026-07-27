"use client";

import { CalendarCheck2, Flame, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { EmptyState, PageHeader, SaveIndicator } from "@/components/ui";
import { formatDate, todayKey } from "@/domain/date";
import { reviewStreak } from "@/domain/selectors";
import type { DailyReviewInput, Mood } from "@/domain/types";
import { useWorkspace } from "@/state/workspace-provider";

const moodLabels: Record<Mood, string> = { low: "低落", neutral: "一般", steady: "平稳", good: "不错", great: "很好" };

const emptyReview = (date: string): DailyReviewInput => ({
  reviewDate: date,
  completedSummary: "",
  mainGain: "",
  blockers: "",
  improvement: "",
  tomorrowFocus: "",
  mood: "steady",
  energy: 3,
  notes: "",
});

export function ReviewsView() {
  const { workspace, saveStatus, error, upsertReview } = useWorkspace();
  const today = todayKey(workspace.profile.timezone);
  const [date, setDate] = useState(today);
  const current = workspace.dailyReviews.find((review) => review.reviewDate === date);
  const [form, setForm] = useState<DailyReviewInput>(() => current ?? emptyReview(date));
  const [validation, setValidation] = useState("");
  const sortedReviews = useMemo(() => [...workspace.dailyReviews].sort((a, b) => b.reviewDate.localeCompare(a.reviewDate)), [workspace.dailyReviews]);
  const streak = reviewStreak(workspace.dailyReviews, today);

  useEffect(() => {
    const review = workspace.dailyReviews.find((item) => item.reviewDate === date);
    setForm(review ?? emptyReview(date));
  }, [date, workspace.dailyReviews]);

  function field<K extends keyof DailyReviewInput>(key: K, value: DailyReviewInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.completedSummary.trim() || !form.mainGain.trim()) {
      setValidation("请至少填写完成事项和最重要的收获");
      return;
    }
    setValidation("");
    try {
      await upsertReview({ ...form, completedSummary: form.completedSummary.trim(), mainGain: form.mainGain.trim() });
    } catch {
      // The form remains populated for retry.
    }
  }

  return (
    <section className="view-page">
      <PageHeader eyebrow="停下来看看今天" title="每日复盘" description="两分钟足够，把真正重要的部分留下。" action={<SaveIndicator status={saveStatus} />} />
      <div className="review-stats">
        <div><CalendarCheck2 size={18} /><span><strong>{workspace.dailyReviews.length}</strong><small>累计复盘</small></span></div>
        <div><Flame size={18} /><span><strong>{streak}</strong><small>连续天数</small></span></div>
      </div>
      <div className="review-layout">
        <form className="review-form" onSubmit={submit}>
          <div className="review-form-header"><div><h2>{date === today ? "今晚，整理一下今天" : formatDate(date)}</h2><p>不用写得完整，真实就好。</p></div><input aria-label="复盘日期" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} /></div>
          <label className="field"><span>今天完成了什么</span><textarea rows={3} value={form.completedSummary} onChange={(event) => field("completedSummary", event.target.value)} placeholder="完成的任务、推进的事情或做出的决定" /></label>
          <label className="field"><span>今天最重要的收获</span><textarea rows={3} value={form.mainGain} onChange={(event) => field("mainGain", event.target.value)} placeholder="一条认识、经验或新的理解" /></label>
          <div className="form-grid">
            <label className="field"><span>今天遇到的阻碍</span><textarea rows={3} value={form.blockers} onChange={(event) => field("blockers", event.target.value)} /></label>
            <label className="field"><span>哪件事可以做得更好</span><textarea rows={3} value={form.improvement} onChange={(event) => field("improvement", event.target.value)} /></label>
          </div>
          <label className="field"><span>明天最重要的一件事</span><input value={form.tomorrowFocus} onChange={(event) => field("tomorrowFocus", event.target.value)} /></label>
          <div className="wellbeing-row">
            <fieldset><legend>今天的情绪</legend><div className="mood-options">{(Object.keys(moodLabels) as Mood[]).map((mood) => <label key={mood}><input type="radio" name="mood" value={mood} checked={form.mood === mood} onChange={() => field("mood", mood)} /><span>{moodLabels[mood]}</span></label>)}</div></fieldset>
            <label className="energy-field"><span>精力 <strong>{form.energy}/5</strong></span><input aria-label="精力" type="range" min="1" max="5" value={form.energy} onChange={(event) => field("energy", Number(event.target.value))} /></label>
          </div>
          <label className="field"><span>自由备注 <small>可选</small></span><textarea rows={2} value={form.notes} onChange={(event) => field("notes", event.target.value)} /></label>
          {validation || error ? <p className="form-error" role="alert">{validation || error}</p> : null}
          <div className="form-actions"><button className="button primary" type="submit"><Sparkles size={16} />保存复盘</button></div>
        </form>
        <aside className="review-history">
          <div className="section-heading"><div><h2>最近复盘</h2><p>回看持续发生的变化。</p></div></div>
          {sortedReviews.length ? <div className="review-list">{sortedReviews.map((review) => <button type="button" key={review.id} className={date === review.reviewDate ? "review-summary active" : "review-summary"} onClick={() => setDate(review.reviewDate)}><header><time>{review.reviewDate === today ? "今天" : formatDate(review.reviewDate, { month: "numeric", day: "numeric" })}</time><span>{moodLabels[review.mood]} · {review.energy}/5</span></header><strong>{review.completedSummary}</strong><p>{review.mainGain}</p></button>)}</div> : <EmptyState icon={<CalendarCheck2 size={22} />} title="还没有复盘" description="第一条记录会从今天开始。" />}
        </aside>
      </div>
    </section>
  );
}
