import React, { useContext, useEffect, useState, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import * as d3 from 'd3';
import axios from 'axios';
import './Progress.css';

const EMOTION_COLORS = {
  Joy:     '#f59e0b',
  Calm:    '#10b981',
  Neutral: '#6366f1',
  Anxiety: '#ef4444',
  Sadness: '#8b5cf6',
};

const getColor = (emotion) => EMOTION_COLORS[emotion] || '#94a3b8';

// ─── Chart 1: Area + Line trend chart ───────────────────────────
function TrendChart({ dailyData, sessionWiseData }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!sessionWiseData || sessionWiseData.length === 0) return;

    const el = svgRef.current;
    const totalW = el.parentElement.clientWidth || 700;
    const W = totalW;
    const H = 320;
    const m = { top: 30, right: 30, bottom: 50, left: 50 };

    const svg = d3.select(el);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    // Parse data
    const sessionPts = sessionWiseData.map(d => ({ 
      date: new Date(d.date), 
      score: d.score, 
      emotion: d.emotion, 
      title: d.title 
    }));
    
    const avgPts = dailyData.map(d => ({ 
      date: d3.timeParse('%Y-%m-%d')(d.date), 
      score: d.avgScore 
    }));

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(sessionPts, d => d.date))
      .range([m.left, W - m.right]);

    const y = d3.scaleLinear().domain([0, 10]).range([H - m.bottom, m.top]);

    // Grid lines
    svg.append('g').attr('class', 'grid')
      .attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-(W - m.left - m.right)).tickFormat(''))
      .call(g => { 
        g.selectAll('line').attr('stroke', '#f1f5f9'); 
        g.select('.domain').remove(); 
      });

    // Axes
    const xAxis = d3.axisBottom(x).ticks(Math.min(avgPts.length, 7)).tickFormat(d3.timeFormat('%d %b'));
    svg.append('g').attr('transform', `translate(0,${H - m.bottom})`)
      .call(xAxis)
      .call(g => { 
        g.select('.domain').attr('stroke', '#cbd5e1'); 
        g.selectAll('text').attr('fill', '#64748b').attr('font-size', '11px').attr('dy', '1.5em'); 
      });

    svg.append('g').attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .call(g => { g.select('.domain').remove(); g.selectAll('text').attr('fill', '#64748b'); });

    // 1. Neon Shadow Defs
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'neonGlow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    // 2. Average Line (The Background Trend)
    const avgLine = d3.line().x(d => x(d.date)).y(d => y(d.score)).curve(d3.curveCatmullRom);
    
    svg.append('path').datum(avgPts)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(131, 103, 199, 0.1)')
      .attr('stroke-width', 10)
      .attr('stroke-linecap', 'round')
      .attr('d', avgLine);

    svg.append('path').datum(avgPts)
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,6')
      .attr('opacity', 0.6)
      .attr('d', avgLine);

    // 3. Connection Line (Session Flow)
    const sessionLine = d3.line().x(d => x(d.date)).y(d => y(d.score)).curve(d3.curveLinear);
    svg.append('path').datum(sessionPts)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(131, 103, 199, 0.3)')
      .attr('stroke-width', 1.5)
      .attr('d', sessionLine);

    // 4. Individual Sessions (Interactive Dots)
    const dots = svg.selectAll('.session-dot').data(sessionPts).enter().append('g')
      .attr('class', 'dot-group');

    dots.append('circle')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.score))
      .attr('r', 8)
      .attr('fill', d => getColor(d.emotion))
      .attr('opacity', 0.2);

    dots.append('circle')
      .attr('class', 'session-dot')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.score))
      .attr('r', 5)
      .attr('fill', d => getColor(d.emotion))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('filter', 'url(#neonGlow)')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).transition().duration(250).attr('r', 10);
        d3.select('#trend-tooltip')
          .style('opacity', 1).style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 40}px`)
          .html(`
            <div class="tooltip-header" style="border-bottom: 1px solid #eee; margin-bottom: 5px; padding-bottom: 5px;">
              <strong>${d3.timeFormat('%H:%M, %d %b')(d.date)}</strong>
            </div>
            <div>Mood Score: <strong style="color:var(--primary)">${d.score}/10</strong></div>
            <div>Detected: <span style="color:${getColor(d.emotion)}">●</span> <strong>${d.emotion}</strong></div>
            <div style="font-size:10px; color:#999; margin-top:5px;">"${d.title || 'Ongoing Chat'}"</div>
          `);
      })
      .on('mouseout', function() {
        d3.select(this).transition().duration(250).attr('r', 5);
        d3.select('#trend-tooltip').style('opacity', 0);
      });

  }, [sessionWiseData, dailyData]);

  return <svg ref={svgRef} className="d3-chart" />;
}

// ─── Chart 2: Donut chart – overall emotion distribution ────────
function DonutChart({ emotionDistribution }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!emotionDistribution || emotionDistribution.length === 0) return;

    const W = 280, H = 280;
    const radius = Math.min(W, H) / 2 - 20;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2})`);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.55).outerRadius(radius + 8);

    const slices = g.selectAll('.arc').data(pie(emotionDistribution)).enter().append('g');

    slices.append('path')
      .attr('d', arc)
      .attr('fill', d => getColor(d.data.emotion))
      .attr('stroke', '#fff').attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .transition().duration(800).attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return t => arc(i(t));
      });

    slices.on('mouseover', function(event, d) {
      d3.select(this).select('path').attr('d', arcHover);
      d3.select('#donut-tooltip')
        .style('opacity', 1).style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 28}px`)
        .html(`<strong>${d.data.emotion}</strong><br/>${d.data.count} session${d.data.count !== 1 ? 's' : ''}`);
    }).on('mouseout', function(event, d) {
      d3.select(this).select('path').attr('d', arc);
      d3.select('#donut-tooltip').style('opacity', 0);
    });

    // Center label
    g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.2em')
      .attr('font-size', '22px').attr('font-weight', '700').attr('fill', '#17252a')
      .text(emotionDistribution.reduce((s, e) => s + e.count, 0));
    g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
      .attr('font-size', '11px').attr('fill', '#8badb5').text('Sessions');

  }, [emotionDistribution]);

  return <svg ref={svgRef} className="donut-chart" />;
}

// ─── Chart 3: Bar chart – daily session count by dominant emotion ─
function DailyBarChart({ dailyData }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!dailyData || dailyData.length === 0) return;

    const el = svgRef.current;
    const totalW = el.parentElement.clientWidth || 700;
    const W = totalW, H = 220;
    const m = { top: 16, right: 16, bottom: 48, left: 40 };

    const svg = d3.select(el);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const x = d3.scaleBand()
      .domain(dailyData.map(d => d.date))
      .range([m.left, W - m.right])
      .padding(0.35);

    const maxSessions = d3.max(dailyData, d => d.sessionCount) || 1;
    const y = d3.scaleLinear().domain([0, maxSessions]).nice().range([H - m.bottom, m.top]);

    // Grid
    svg.append('g').attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(Math.min(maxSessions, 5)).tickSize(-(W - m.left - m.right)).tickFormat(''))
      .call(g => { g.selectAll('line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,3'); g.select('.domain').remove(); });

    // X axis
    svg.append('g').attr('transform', `translate(0,${H - m.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d => {
        const p = d3.timeParse('%Y-%m-%d')(d);
        return p ? d3.timeFormat('%d %b')(p) : d;
      }))
      .call(g => { g.select('.domain').remove(); g.selectAll('text').attr('fill', '#8badb5').attr('font-size', '11px'); g.selectAll('line').remove(); });

    // Y axis
    svg.append('g').attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(Math.min(maxSessions, 5)))
      .call(g => { g.select('.domain').remove(); g.selectAll('text').attr('fill', '#8badb5').attr('font-size', '11px'); g.selectAll('line').remove(); });

    // Bars
    svg.selectAll('.bar').data(dailyData).enter().append('rect')
      .attr('x', d => x(d.date)).attr('width', x.bandwidth())
      .attr('y', H - m.bottom).attr('height', 0)
      .attr('rx', 6).attr('fill', d => getColor(d.dominant))
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1);
        d3.select('#bar-tooltip')
          .style('opacity', 1).style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 28}px`)
          .html(`<strong>${d.date}</strong><br/>Sessions: ${d.sessionCount}<br/>Dominant: ${d.dominant}`);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.85);
        d3.select('#bar-tooltip').style('opacity', 0);
      })
      .transition().duration(700).delay((_, i) => i * 60)
      .attr('y', d => y(d.sessionCount))
      .attr('height', d => H - m.bottom - y(d.sessionCount));

  }, [dailyData]);

  return <svg ref={svgRef} className="d3-chart" />;
}

// ─── Main Page Component ────────────────────────────────────────
const Progress = () => {
  const { user } = useContext(AuthContext);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const { data } = await axios.get('http://localhost:5000/api/analytics/emotions', config);
        setAnalyticsData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (!user) return <div className="p-4">Please log in.</div>;
  if (loading) return <div className="p-4 text-muted">Loading your journey...</div>;

  const { dailyData, sessionWiseData, emotionDistribution, summary } = analyticsData || {};
  const hasData = dailyData && dailyData.length > 0;

  return (
    <div className="progress-container animate-fade-in">
      {/* Global tooltips */}
      <div id="trend-tooltip" className="chart-tooltip" />
      <div id="donut-tooltip" className="chart-tooltip" />
      <div id="bar-tooltip"   className="chart-tooltip" />

      <header className="progress-header">
        <h2>Your Emotional Journey 🌱</h2>
        <p className="text-muted">Insights from your last 30 days of conversations</p>
      </header>

      {/* Summary Stat Cards */}
      {summary && (
        <section className="summary-cards">
          <div className="card stat-card">
            <div className="stat-value">{summary.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{summary.activeDays}</div>
            <div className="stat-label">Active Days</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value">{summary.bestScore}<span className="stat-unit">/10</span></div>
            <div className="stat-label">Best Mood Score</div>
          </div>
          <div className="card stat-card">
            <div className="stat-value" style={{ color: getColor(summary.mostCommon) }}>{summary.mostCommon}</div>
            <div className="stat-label">Most Common Mood</div>
          </div>
        </section>
      )}

      {!hasData ? (
        <div className="card no-data-card">
          <div className="no-data-icon">💬</div>
          <h3>No data yet</h3>
          <p className="text-muted">Start chatting to see your emotional progress here.</p>
        </div>
      ) : (
        <>
          {/* Chart 1: Mood Trend (Area + Line) */}
          <section className="card chart-section">
            <div className="chart-title">
              <h3>📈 Mood Score Trend</h3>
              <p className="text-muted chart-desc">Granular session-wise scores (dots) vs Daily Average (dashed line)</p>
            </div>
            <TrendChart dailyData={dailyData} sessionWiseData={sessionWiseData} />
            <div className="trend-legend">
               <div className="legend-item"><span className="legend-line dash" /> <span>Daily Average</span></div>
               <div className="legend-item"><span className="legend-dot-ref" /> <span>Individual Sessions</span></div>
            </div>
          </section>

          {/* Chart 2 + Legend: Emotion Distribution Donut */}
          <section className="card chart-section donut-section">
            <div className="chart-title">
              <h3>🎯 Emotion Distribution</h3>
              <p className="text-muted chart-desc">Overall breakdown of your emotional states</p>
            </div>
            <div className="donut-wrapper">
              <DonutChart emotionDistribution={emotionDistribution} />
              <div className="donut-legend">
                {emotionDistribution?.map(e => (
                  <div key={e.emotion} className="legend-item">
                    <span className="legend-dot" style={{ background: getColor(e.emotion) }} />
                    <span className="legend-label">{e.emotion}</span>
                    <span className="legend-count">{e.count} session{e.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Chart 3: Daily Session Bar Chart */}
          <section className="card chart-section">
            <div className="chart-title">
              <h3>📅 Daily Activity</h3>
              <p className="text-muted chart-desc">Number of sessions per day, colored by dominant emotion</p>
            </div>
            <DailyBarChart dailyData={dailyData} />
            {/* Color legend */}
            <div className="bar-legend">
              {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
                <div key={emotion} className="legend-item">
                  <span className="legend-dot" style={{ background: color }} />
                  <span>{emotion}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Day-wise Session Detail Table */}
          <section className="card chart-section">
            <div className="chart-title">
              <h3>🗂️ Day-wise Session Detail</h3>
              <p className="text-muted chart-desc">Every day's sessions and moods at a glance</p>
            </div>
            <div className="table-wrapper">
              <table className="session-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sessions</th>
                    <th>Avg Score</th>
                    <th>Dominant Mood</th>
                    <th>Emotions Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map(day => (
                    <tr key={day.date}>
                      <td className="td-date">{new Date(day.date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                      <td>{day.sessionCount}</td>
                      <td>
                        <div className="score-bar-wrap">
                          <div className="score-bar" style={{ width: `${day.avgScore * 10}%`, background: getColor(day.dominant) }} />
                          <span>{day.avgScore}</span>
                        </div>
                      </td>
                      <td>
                        <span className="emotion-pill" style={{ background: getColor(day.dominant) + '30', color: getColor(day.dominant) }}>
                          {day.dominant}
                        </span>
                      </td>
                      <td className="td-emotions">
                        {Object.entries(day.emotions).map(([e, c]) => (
                          <span key={e} className="emotion-chip" style={{ borderColor: getColor(e), color: getColor(e) }}>
                            {e} ×{c}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Progress;
