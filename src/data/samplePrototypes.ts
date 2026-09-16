export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  html: string;
}

export const SAMPLE_PROTOTYPES: SamplePreset[] = [
  {
    id: 'saas-dashboard',
    name: 'SaaS Analytics Dashboard',
    description: 'Modern administrative dashboard with KPI metrics, performance chart, and team roster.',
    category: 'Web App',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PulseMetrics Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; min-height: 100vh; }
    .sidebar { width: 250px; background: #1e293b; border-right: 1px solid #334155; padding: 24px 16px; display: flex; flex-direction: column; gap: 24px; }
    .logo { font-size: 20px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .nav { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .nav a { display: flex; align-items: center; gap: 12px; color: #94a3b8; padding: 10px 14px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; transition: all 0.2s; }
    .nav a.active, .nav a:hover { background: #0284c7; color: #ffffff; }
    .main { flex: 1; padding: 32px 40px; overflow-y: auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .header h1 { font-size: 26px; font-weight: 700; }
    .btn-primary { background: #0ea5e9; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 32px; }
    .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
    .stat-title { color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 30px; font-weight: 800; margin: 10px 0 6px 0; color: #ffffff; }
    .stat-badge { font-size: 13px; font-weight: 600; color: #34d399; }
    .chart-container { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 32px; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .bars { display: flex; align-items: flex-end; gap: 16px; height: 180px; padding-top: 20px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; max-width: 44px; background: linear-gradient(180deg, #38bdf8 0%, #0284c7 100%); border-radius: 6px 6px 0 0; }
    .bar-label { font-size: 12px; color: #64748b; }
    .table-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; }
    th { padding: 12px 16px; border-bottom: 1px solid #334155; color: #94a3b8; font-weight: 600; }
    td { padding: 14px 16px; border-bottom: 1px solid #1e293b; color: #e2e8f0; }
    .badge-live { background: rgba(52, 211, 153, 0.2); color: #34d399; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="logo">⚡ PulseMetrics</div>
    <ul class="nav">
      <li><a href="#overview" class="active">📊 Overview</a></li>
      <li><a href="#realtime">⚡ Realtime Feed</a></li>
      <li><a href="#customers">👥 Customers</a></li>
      <li><a href="#settings">⚙️ Settings</a></li>
    </ul>
  </div>
  <div class="main">
    <div class="header">
      <div>
        <h1>Prototype Review: Cloud Q3 Performance</h1>
        <p style="color:#94a3b8; font-size:14px; margin-top:4px;">Draft version 1.4 — Ready for stakeholder critique</p>
      </div>
      <button class="btn-primary" id="header-export-btn">+ Export CSV</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card" id="card-mrr">
        <div class="stat-title">Monthly Recurring Revenue</div>
        <div class="stat-value">$128,450</div>
        <div class="stat-badge">↑ 18.4% vs last month</div>
      </div>
      <div class="stat-card" id="card-active-users">
        <div class="stat-title">Active Team Seats</div>
        <div class="stat-value">4,821</div>
        <div class="stat-badge">↑ 12% expansion</div>
      </div>
      <div class="stat-card" id="card-latency">
        <div class="stat-title">Avg API Latency</div>
        <div class="stat-value">42ms</div>
        <div class="stat-badge" style="color: #38bdf8;">Optimal SLA 99.98%</div>
      </div>
    </div>

    <div class="chart-container" id="chart-section">
      <div class="chart-header">
        <h3 style="font-size:18px;">Traffic Volume by Region (GiB)</h3>
        <span style="font-size:13px; color:#94a3b8;">Updated 3 mins ago</span>
      </div>
      <div class="bars">
        <div class="bar-col"><div class="bar" style="height: 45%;"></div><span class="bar-label">Mon</span></div>
        <div class="bar-col"><div class="bar" style="height: 65%;"></div><span class="bar-label">Tue</span></div>
        <div class="bar-col"><div class="bar" style="height: 90%;"></div><span class="bar-label">Wed</span></div>
        <div class="bar-col"><div class="bar" style="height: 75%;"></div><span class="bar-label">Thu</span></div>
        <div class="bar-col"><div class="bar" style="height: 85%;"></div><span class="bar-label">Fri</span></div>
        <div class="bar-col"><div class="bar" style="height: 50%;"></div><span class="bar-label">Sat</span></div>
        <div class="bar-col"><div class="bar" style="height: 60%;"></div><span class="bar-label">Sun</span></div>
      </div>
    </div>

    <div class="table-card" id="recent-signups">
      <h3 style="font-size:16px; margin-bottom:16px;">Recent Enterprise Onboardings</h3>
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Tier</th>
            <th>Seats</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Acme Corporation</td>
            <td>Enterprise Cloud</td>
            <td>240</td>
            <td><span class="badge-live">Active</span></td>
          </tr>
          <tr>
            <td>Vertex Robotics</td>
            <td>Scale Tier</td>
            <td>85</td>
            <td><span class="badge-live">Active</span></td>
          </tr>
          <tr>
            <td>Nova Health Tech</td>
            <td>Enterprise Plus</td>
            <td>510</td>
            <td><span class="badge-live">Active</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'checkout-flow',
    name: 'E-Commerce Checkout & Payment',
    description: 'Clean high-conversion checkout flow with order summary, address inputs, and payment radio cards.',
    category: 'E-Commerce',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Checkout Prototype</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 24px; }
    .container { max-width: 960px; margin: 0 auto; }
    .header { margin-bottom: 32px; }
    .brand { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
    .layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; }
    @media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; }
    .card-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; }
    .form-input { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; }
    .form-input:focus { border-color: #6366f1; ring: 2px rgba(99,102,241,0.2); }
    .form-row { display: flex; gap: 12px; }
    .form-row .form-group { flex: 1; }
    .btn-submit { width: 100%; background: #4f46e5; color: #ffffff; border: none; padding: 14px; font-size: 15px; font-weight: 700; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
    .btn-submit:hover { background: #4338ca; }
    .order-item { display: flex; gap: 14px; align-items: center; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; }
    .item-img { width: 56px; height: 56px; background: #e0e7ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .item-details { flex: 1; }
    .item-title { font-size: 14px; font-weight: 600; }
    .item-qty { font-size: 12px; color: #64748b; margin-top: 2px; }
    .item-price { font-weight: 700; font-size: 15px; }
    .summary-row { display: flex; justify-content: space-between; font-size: 14px; color: #64748b; margin-bottom: 10px; }
    .summary-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #0f172a; padding-top: 14px; border-top: 2px dashed #e2e8f0; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">✦ Lumina Studio Store</div>
      <p style="color:#64748b; font-size:14px; margin-top:4px;">Review Prototype: Express 2-Step Checkout</p>
    </div>
    <div class="layout">
      <div class="left-column">
        <div class="card" id="shipping-section">
          <h2 class="card-title">1. Shipping Address</h2>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input class="form-input" value="Alex" />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input class="form-input" value="Morgan" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Delivery Street</label>
            <input class="form-input" value="742 Evergreen Terrace, Suite 100" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">City</label>
              <input class="form-input" value="San Francisco" />
            </div>
            <div class="form-group">
              <label class="form-label">Postal Code</label>
              <input class="form-input" value="94107" />
            </div>
          </div>
        </div>

        <div class="card" id="payment-section">
          <h2 class="card-title">2. Payment Method</h2>
          <div style="padding: 12px; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; margin-bottom: 16px; font-size: 13px; color: #4338ca;">
            🔒 256-bit encrypted checkout with Stripe Zero-Fraud guarantee.
          </div>
          <div class="form-group">
            <label class="form-label">Card Number</label>
            <input class="form-input" placeholder="•••• •••• •••• 4242" value="4242 •••• •••• 9012" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Expiry Date</label>
              <input class="form-input" placeholder="MM / YY" value="08 / 28" />
            </div>
            <div class="form-group">
              <label class="form-label">CVC Code</label>
              <input class="form-input" placeholder="123" value="842" />
            </div>
          </div>
        </div>
      </div>

      <div class="right-column">
        <div class="card" id="order-summary-card">
          <h2 class="card-title">Order Summary</h2>
          <div class="order-item">
            <div class="item-img">🎧</div>
            <div class="item-details">
              <div class="item-title">Aura ANC Wireless Headphones</div>
              <div class="item-qty">Qty: 1 · Space Black</div>
            </div>
            <div class="item-price">$249.00</div>
          </div>
          <div class="order-item">
            <div class="item-img">⚡</div>
            <div class="item-details">
              <div class="item-title">Braided Fast-Charge USB-C Cable</div>
              <div class="item-qty">Qty: 2 · 2.0 Meters</div>
            </div>
            <div class="item-price">$38.00</div>
          </div>
          
          <div class="summary-row">
            <span>Subtotal</span>
            <span>$287.00</span>
          </div>
          <div class="summary-row">
            <span>Shipping</span>
            <span style="color:#16a34a; font-weight:600;">FREE Express</span>
          </div>
          <div class="summary-row">
            <span>Estimated Sales Tax</span>
            <span>$21.50</span>
          </div>
          <div class="summary-total">
            <span>Total to Pay</span>
            <span>$308.50</span>
          </div>
          
          <button class="btn-submit" id="place-order-cta" style="margin-top: 20px;">Complete Purchase ($308.50)</button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'mobile-landing',
    name: 'Mobile App Marketing Landing',
    description: 'High-converting mobile app landing page with hero CTA, device preview, and feature grid.',
    category: 'Marketing',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FocusCraft App Landing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; line-height: 1.6; }
    .hero { max-width: 1080px; margin: 0 auto; padding: 70px 24px; text-align: center; }
    .tag { display: inline-block; background: #f1f5f9; color: #0284c7; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 20px; margin-bottom: 20px; }
    .title { font-size: 46px; font-weight: 800; letter-spacing: -1.2px; line-height: 1.2; margin-bottom: 18px; color: #0f172a; }
    .subtitle { font-size: 18px; color: #64748b; max-width: 620px; margin: 0 auto 32px auto; }
    .cta-group { display: flex; justify-content: center; gap: 16px; margin-bottom: 50px; }
    .btn { padding: 14px 26px; border-radius: 10px; font-weight: 700; font-size: 15px; cursor: pointer; text-decoration: none; border: none; }
    .btn-main { background: #0284c7; color: #ffffff; box-shadow: 0 4px 14px rgba(2,132,199,0.3); }
    .btn-alt { background: #f1f5f9; color: #334155; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; max-width: 1000px; margin: 0 auto 60px auto; padding: 0 20px; }
    .feature-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px; text-align: left; }
    .feature-icon { font-size: 32px; margin-bottom: 14px; }
    .feature-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .feature-desc { font-size: 14px; color: #64748b; }
  </style>
</head>
<body>
  <section class="hero">
    <span class="tag" id="hero-tag">✨ Now with AI Flow Scheduling</span>
    <h1 class="title" id="hero-headline">Deep work sessions for high-velocity teams</h1>
    <p class="subtitle" id="hero-subtext">FocusCraft blocks distractions, automates pomodoro cycles, and syncs directly with GitHub PRs and Jira sprints.</p>
    <div class="cta-group" id="hero-cta-buttons">
      <button class="btn btn-main" id="btn-download-app">Start Free 14-Day Trial</button>
      <button class="btn btn-alt" id="btn-watch-demo">Watch 2-Min Walkthrough</button>
    </div>
  </section>

  <section class="feature-grid">
    <div class="feature-card" id="feature-1">
      <div class="feature-icon">🛡️</div>
      <h3 class="feature-title">Zero Context Switching</h3>
      <p class="feature-desc">Batch Slack notifications and calendar invites during deep concentration blocks.</p>
    </div>
    <div class="feature-card" id="feature-2">
      <div class="feature-icon">⚡</div>
      <h3 class="feature-title">Realtime Sprint Sync</h3>
      <p class="feature-desc">Connect directly to Linear, GitHub, and Jira to update tickets without opening your browser.</p>
    </div>
    <div class="feature-card" id="feature-3">
      <div class="feature-icon">📈</div>
      <h3 class="feature-title">Focus Velocity Analytics</h3>
      <p class="feature-desc">Understand peak productive hours across distributed time zones with zero micromanagement.</p>
    </div>
  </section>
</body>
</html>`
  }
];
