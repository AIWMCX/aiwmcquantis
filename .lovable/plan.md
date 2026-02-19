# Growth & Retention Plan: 3 High-Impact Features

## Problem Summary

Activity is dropping not because the product is weak, but because:

1. The viral loop (share after analysis) fires too early and uses boring copy
2. There is no reason to return after a first analysis — no retention hook
3. There is nothing "ambient" to show on social media that demonstrates the tool's power without requiring a click

## The Plan: 3 Features That Work Together

---

### Feature 1 — Fix the Share Flow (Viral Loop Repair)

**Current behavior:** `ShareSuccessModal` fires 1.5 seconds after results load, before the user has read anything. They dismiss it.

**Fix:**

- Delay the modal to **8 seconds** (after the user has scrolled and seen their numbers)
- Replace the share text with something curiosity-driven:
  - Old: *"I scored 7/10 on my business idea analysis!"*
  - New: *"Quantis gave my Coffee Shop idea a 7/10. Here's why: $4,200/mo profit, 3 risk flags caught before launch. See the full breakdown:"* (with shared link)
- Add a **"Copy as Image Caption"** button that pre-formats text for Instagram/LinkedIn posts with the key metrics — profit, score, payback — ready to paste

**Files to modify:**

- `src/components/analysis/ShareSuccessModal.tsx` — new share text template, delayed trigger
- `src/components/analysis/AnalysisResults.tsx` — change the 1500ms timer to 8000ms

---

### Feature 2 — Public Idea Leaderboard ("This Week's Top Ideas")

**What it is:** A public page (`/leaderboard`) that shows the **top 10 highest-scored business ideas** from the past 7 days, anonymized to idea type + city + score + key metric. No login required. Refreshes weekly.

**Why it works:**

- Gives you something real and specific to post on social media every week without writing anything
- Drives curiosity — people want to see how their idea would compare
- Creates a natural CTA: "Run your idea →"
- Gets shared by people who see their idea type on the list

**What's shown per entry:**

```
🏆 #1 — Boutique Hotel | Austin, TX | Score: 9/10
   Monthly Profit: $12,400 | Payback: 5.2 months
```

**Privacy:** Only shows idea type (not the full user input), city, and score. No user data exposed.

**Implementation:**

- Add a `is_public_leaderboard` boolean field to the `analyses` table (opt-in, default false)
- OR derive from analyses where the user has already created a public share link (already opted into public)
- New page: `src/pages/Leaderboard.tsx`
- New edge function query or Supabase RPC: `get_weekly_leaderboard()`
- Add "Leaderboard" link to the landing page nav

---



**Why it works:**

- Gives users a reason to come back every week
- Feels personalized (uses their actual analysis data)
- Costs nothing to send (already have `send-lifecycle-email` infrastructure)

**Implementation:**

- Extend `check-lifecycle-emails` edge function to include a "weekly_pulse" sequence step
- Uses existing `user_engagement` table to find users with analyses
- Uses existing `analyses` table to pull their highest-scored idea
- Reuses `send-lifecycle-email` for delivery

---

## Technical Details

### Database changes needed

**Option A (recommended) — derive leaderboard from existing shared reports:**
No new columns needed. Query `shared_reports` joined to `analyses` to find analyses that users have already chosen to make public. This respects privacy — only analyses with an existing share link appear.

**Option B — opt-in leaderboard flag:**

```sql
ALTER TABLE public.analyses 
ADD COLUMN show_on_leaderboard boolean DEFAULT false;
```

Use Option A first — simpler, no migration needed.

### New RPC for leaderboard

```sql
CREATE OR REPLACE FUNCTION get_weekly_leaderboard()
RETURNS TABLE(...) AS $$
  SELECT 
    a.result->>'industry_detected' as industry,
    a.location,
    (a.result->>'confidence_score')::int as score,
    -- monthly profit from nested JSON
    ...
  FROM analyses a
  INNER JOIN shared_reports sr ON sr.analysis_id = a.id
  WHERE sr.created_at > NOW() - INTERVAL '7 days'
    AND sr.expires_at > NOW()
  ORDER BY score DESC
  LIMIT 10
$$ LANGUAGE sql SECURITY DEFINER;
```

### Files to create/modify


| File                                                 | Action                             |
| ---------------------------------------------------- | ---------------------------------- |
| `src/pages/Leaderboard.tsx`                          | Create — public leaderboard page   |
| `src/components/analysis/ShareSuccessModal.tsx`      | Modify — better share copy         |
| `src/components/analysis/AnalysisResults.tsx`        | Modify — delay modal to 8s         |
| `src/components/landing/Landing.tsx`                 | Modify — add Leaderboard nav link  |
| `supabase/functions/check-lifecycle-emails/index.ts` | Modify — add weekly pulse step     |
| Database migration                                   | New RPC `get_weekly_leaderboard()` |


---

## Sequencing

1. **First** — Fix the share modal (30 min, highest ROI, zero risk)
2. **Second** — Build the leaderboard page (gives you shareable social content immediately)
  &nbsp;

---

## What This Achieves

- Every user who completes an analysis now has a **pre-written social post** ready to paste, with their specific numbers — this is the viral loop that brings new users
- The leaderboard gives you **weekly content to post** without writing anything — just screenshot the top 3 and post "This week's top business ideas on Quantis"
- Combined: lower acquisition cost, higher retention, organic word-of-mouth      QUANTIS EMERGENCY RESCUE PLAN
  ## The REAL Problem + Immediate Fixes (No Rebuild Needed)
  Bogdan, I understand your panic. Let me give you the **brutal truth** and **immediate actions** you can take TODAY.
  ---
  ## THE REAL DIAGNOSIS (Why People Leave)
  ### Problem #1: Your Homepage Doesn't Show VALUE in 3 Seconds
  **What visitors see:**
  - "AI Business Validation & Financial Structuring in Under 3 Minutes"
  - Pricing cards
  - Generic features
  **What their brain thinks:**
  - "Another AI validator? I've seen 20 of these"
  - "Financial structuring? Sounds complicated"
  - "Why not just use the free FounderPal?"
  - **[LEAVES IN 8 SECONDS]**
  **THE FIX (2 hours of work):**
  Change your homepage headline from this:
  ```
  "AI Business Validation & Financial Structuring in Under 3 Minutes"
  ```
  To this:
  ```
  "The Only AI Validator That Also Shows You 
  How to Structure Your Finances From Day One"

  [Subheading]
  "Most validators just say 'good idea' or 'bad idea.'
  Quantis tells you HOW to make it profitable."
  ```
  **Why this works:** You just differentiated from ALL competitors in one sentence.
  ---
  ### Problem #2: No Reason to Come Back (One-Time Use = Dead App)
  **What happens now:**
  1. User validates their idea
  2. Gets results
  3. Downloads PDF
  4. **Never returns**
  5. **Your activity dies**
  **THE FIX (4 hours of work):**
  Add "Idea Progress Tracker" to every analysis:
  tsx
  ```tsx
  // After analysis completes, show this:
  function PostAnalysisScreen() {
    return (
      <div>
        {/* Results */}
        <ResultsDashboard />
        
        {/* NEW: Track Progress */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl">
          <h3 className="text-2xl font-bold mb-4">
            Track Your Progress (Free)
          </h3>
          
          <p className="text-lg mb-6">
            Come back weekly to update your progress. Quantis will:
            • Track how close you are to launch
            • Adjust financial projections based on real data
            • Alert you to risks as they emerge
          </p>

          <div className="flex gap-4">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold">
               Track My Progress (Free)
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold">
               Just Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  }
  ```
  **Implementation:**
  1. Add a "Track Progress" button after every analysis
  2. Save their idea to their account
  3. Send them a weekly email: "Update your progress for [Idea Name]"
  4. Show a dashboard with their tracked metrics over time
  **Result:** People come back EVERY WEEK instead of once.
  ---
  ### Problem #3: People Don't Share (No Viral Growth)
  **Current flow:**
  - User gets analysis
  - Downloads PDF
  - Tells nobody
  - **Zero new users**
  **THE FIX (3 hours of work):**
  Make results SHAREABLE with a unique link:
  tsx
  ```tsx
  function ShareableResults() {
    const shareUrl = `aiwmcquantis.com/idea/${uniqueId}`;
    
    return (
      <div className="mt-6 bg-yellow-50 border-2 border-yellow-400 p-6 rounded-xl">
        <h3 className="text-xl font-bold mb-3">
           Share Your Validation (And Help Others)
        </h3>
        
        <p className="text-gray-700 mb-4">
          Your analysis is now public at: <strong>{shareUrl}</strong>
        </p>

        <div className="grid grid-cols-3 gap-3">
          <button className="bg-blue-500 text-white py-3 rounded-lg font-semibold">
             Share on Twitter
          </button>
          <button className="bg-blue-700 text-white py-3 rounded-lg font-semibold">
             Share on LinkedIn
          </button>
          <button className="bg-gray-600 text-white py-3 rounded-lg font-semibold">
             Copy Link
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-3">
           Every share helps other founders discover Quantis
        </p>
      </div>
    );
  }
  ```

  **What happens:**
  1. User shares their results on Twitter/LinkedIn
  2. Their network clicks the link
  3. Sees the analysis results
  4. Wants to validate THEIR idea
  5. **New users WITHOUT you doing anything**

  **Pre-filled share text:**
  ```
  "Just validated my [idea name] with @AIWMCQuantis. 
  The financial structuring analysis is 

  Got insights in 3 minutes that would've taken weeks with a consultant.

  Check out my results: [link]"
  ```

  ---

  ## THE GENIUS MOVES (Immediate Impact)

  ### Move #1: Post RESULTS, Not Features (Change Social Strategy TODAY)

  **STOP posting:**
  - "Quantis can validate your business idea!"
  - "Try our AI-powered analysis!"
  - "Get financial insights fast!"

  **START posting:**
  ```
  Tweet Example 1:
  "We validated 3 real startup ideas this week.

  Idea 1: AI resume builder
  ✅ Good market (45K monthly searches)
  ⚠️ Monetization risk (people expect free)
  📊 Needs $15/mo to be profitable

  Idea 2: Newsletter for indie hackers
  ✅ Strong recurring revenue potential
  ❌ Crowded market (327 competitors)
  📊 Needs unique angle to stand out

  Idea 3: [...]

  Validated all 3 in under 10 minutes with Quantis.

  What should we validate next?"
  ```

  **Why this works:**
  - Shows actual value (not just claims)
  - Creates curiosity (people want to see their idea)
  - Shareable (people tag friends with ideas)
  - Drives clicks (specific examples > vague promises)

  **Do this 3x per week** instead of daily generic posts.

  ---

  ### Move #2: Reddit Guerrilla Strategy (50+ Visitors Per Comment)

  **Target subreddits:**
  - r/Entrepreneur
  - r/startups  
  - r/SideProject
  - r/business
  - r/IMadeThis (when you post about Quantis itself)

  **DON'T do this:**
  - Post "Hey, check out my tool!" = Downvoted, banned

  **DO this:**
  - Find posts where someone asks "Should I build [idea]?"
  - Give them REAL advice
  - Mention Quantis naturally at the END

  **Example comment:**
  ```
  "I'd validate these 3 things first:

  1. Market size - How many people search for this monthly?
  2. Competition - Are there 5+ established players?
  3. Monetization - Will people actually pay?

  I usually run ideas through Quantis (disclaimer: I use it for my own projects)
  because it checks all 3 in under 3 minutes and shows the financial breakdown.

  But even without tools, you can manually research those 3 things in an afternoon.

  Good luck with the idea!"
  ```
  **Result:**
  - Helpful (upvoted)
  - Authentic (not spammy)
  - Drives 20-50 clicks per comment
  - **Do this 2x per week**
  ---
  ### Move #3: Make First 10 Seconds CRYSTAL CLEAR
  **Current problem:** People don't understand what makes you different in 10 seconds.
  **The fix:** Add a comparison table RIGHT on the homepage:
  tsx
  ```tsx
  <div className="py-16 bg-gray-50">
    <div className="max-w-6xl mx-auto px-6">
      <h2 className="text-4xl font-bold text-center mb-12">
        Why Founders Choose Quantis Over Alternatives
      </h2>

      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Feature</th>
              <th className="p-4 text-center">Other Validators</th>
              <th className="p-4 text-center bg-blue-50">
                <div className="font-bold text-blue-600">Quantis</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-4 font-semibold">Market validation</td>
              <td className="p-4 text-center">✅</td>
              <td className="p-4 text-center bg-blue-50">✅</td>
            </tr>
            <tr className="border-t">
              <td className="p-4 font-semibold">Competition analysis</td>
              <td className="p-4 text-center">✅</td>
              <td className="p-4 text-center bg-blue-50">✅</td>
            </tr>
            <tr className="border-t bg-yellow-50">
              <td className="p-4 font-semibold">Financial structuring</td>
              <td className="p-4 text-center text-gray-400">❌</td>
              <td className="p-4 text-center bg-blue-50 text-green-600 font-bold">✅</td>
            </tr>
            <tr className="border-t bg-yellow-50">
              <td className="p-4 font-semibold">Revenue projections</td>
              <td className="p-4 text-center text-gray-400">❌</td>
              <td className="p-4 text-center bg-blue-50 text-green-600 font-bold">✅</td>
            </tr>
            <tr className="border-t bg-yellow-50">
              <td className="p-4 font-semibold">Expense breakdown</td>
              <td className="p-4 text-center text-gray-400">❌</td>
              <td className="p-4 text-center bg-blue-50 text-green-600 font-bold">✅</td>
            </tr>
            <tr className="border-t bg-yellow-50">
              <td className="p-4 font-semibold">Profitability timeline</td>
              <td className="p-4 text-center text-gray-400">❌</td>
              <td className="p-4 text-center bg-blue-50 text-green-600 font-bold">✅</td>
            </tr>
            <tr className="border-t">
              <td className="p-4 font-semibold">Price</td>
              <td className="p-4 text-center">Free</td>
              <td className="p-4 text-center bg-blue-50 font-bold">
                3 free, then $17/mo
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-center text-gray-600 mt-6 text-lg">
        💡 Most validators tell you IF your idea is good.<br/>
        <strong>Quantis tells you HOW to make it profitable.</strong>
      </p>
    </div>
  </div>
  ```

  **Add this table** right after your hero section. People will instantly see your advantage.

  ---

  ## THE 7-DAY EMERGENCY PLAN

  ### Day 1 (TODAY - 3 hours):
  ```
  ✅ Change homepage headline (30 min)
  ✅ Add comparison table (1 hour)
  ✅ Add shareable results links (1.5 hours)

  Result: Visitors understand value in 3 seconds
  ```

  ### Day 2 (4 hours):
  ```
  ✅ Add "Track Progress" feature (4 hours)
     - Create a "My Ideas" dashboard
     - Add "Update Progress" button
     - Set up weekly email reminder

  Result: Users have reason to come back
  ```

  ### Day 3-4 (6 hours):
  ```
  ✅ Write 3 "real validation results" posts for social
  ✅ Post them on Twitter, LinkedIn with actual examples
  ✅ Find 3 Reddit threads and add helpful comments

  Result: 100-200 new visitors from social/Reddit
  ```

  ### Day 5-6 (8 hours):
  ```
  ✅ Install Microsoft Clarity (free heatmaps)
  ✅ Watch 20 session recordings
  ✅ Find exactly where people drop off
  ✅ Fix the top 3 friction points

  Result: You KNOW what's broken instead of guessing
  ```

  ### Day 7 (2 hours):
  ```
  ✅ Email all 716 existing users:
     "We added progress tracking - come back and update your idea"
  ✅ Track how many return

  Result: Re-engage dead users
  ```

  ---

  ## PRICING OPTIMIZATION (Optional - Only If You Want)

  You said you might decrease from $17. Here's my take:

  **Option A: Keep $17, Add Value**
  ```
  FREE: 3 validations
  PLUS ($17/mo): 
    - Unlimited validations
    - Progress tracking
    - Weekly email updates
    - Priority support
  ```

  **Option B: Lower to $9, More Will Convert**
  ```
  FREE: 3 validations
  STARTER ($9/mo):
    - 10 validations/month
    - Progress tracking
    
  PLUS ($17/mo):
    - Everything in Starter
    - Unlimited validations
    - Weekly reports
    - API access
  ```
  **My recommendation:** Keep $17 but make the value OBVIOUS. If you drop to $9, you'll need 2x customers to make the same money.
  ---
  ## THE METRICS THAT ACTUALLY MATTER
  **Stop obsessing over:**
  - Daily visitors
  - Social media impressions
  - How many people "saw" your posts
  **Start tracking:**
  1. **Activation Rate:** What % of visitors start an analysis?
    - Target: 30%
    - If below 20%, your homepage is broken
  2. **Completion Rate:** What % finish the analysis?
    - Target: 70%
    - If below 50%, your form is too complex
  3. **Share Rate:** What % share their results?
    - Target: 10%
    - If below 5%, your results aren't shareable enough
  4. **Return Rate (7 days):** What % come back in 7 days?
    - Target: 25%
    - If below 10%, you have no retention hooks
  5. **Free → Paid:** What % of free users upgrade?
    - Target: 5%
    - If below 2%, your paid value isn't clear
  **Track these 5 numbers. Improve them one at a time.**
  ---
  ## THE HARSH TRUTH
  Bogdan, your app isn't dying because it's bad. It's dying because:
  1. **Nobody sees why it's different** (all validators look the same)
  2. **Nobody comes back** (one-time use = death)
  3. **Nobody shares it** (no viral growth)
  But here's the good news: **All 3 are fixable in ONE WEEK.**
  You don't need to rebuild. You don't need a new business model. You need to:
  ✅ Differentiate (financial structuring = your superpower) ✅ Add retention (progress tracking) ✅ Enable virality (shareable results)
  ---
  ## YOUR IMMEDIATE ACTION LIST (Next 24 Hours)
  1. **Change your homepage headline RIGHT NOW** (30 minutes)
    - From: "AI Business Validation & Financial Structuring"
    - To: "The Only Validator That Shows You HOW to Make Your Idea Profitable"
  2. **Add a comparison table** (1 hour)
    - Show what you do that others don't
  3. **Add share buttons to results** (2 hours)
    - Make every analysis shareable
  4. **Post ONE real validation example** on Twitter/LinkedIn (30 minutes)
    - Use actual results, not generic "try our tool" posts
  5. **Install Microsoft Clarity** (15 minutes)
    - Watch session recordings tomorrow to see where people drop off
  **Total time: 4 hours 15 minutes**
  **Expected result:**
  - 20-30% bounce rate improvement
  - 50-100 new visitors from social
  - First viral shares within 3 days
  ---
  ## THE BOTTOM LINE
  Your app is NOT dead. But it needs **immediate triage**:
   **Fix the bleeding:** Make value clear in 3 seconds  **Add circulation:** Give people reason to return  **Enable growth:** Make results shareable
  **Do the 7-day plan. Track the 5 metrics. Report back in a week.**
  You've got this. The product is solid. You just need to show people WHY they should care.