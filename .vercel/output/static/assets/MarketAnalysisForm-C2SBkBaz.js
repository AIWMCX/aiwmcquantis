import{r as u,j as e}from"./ui-vendor-Ci_jhfUT.js";import{u as S,z as r}from"./forms-5vTbOgwK.js";import{t as C}from"./zod-DDx_hEyQ.js";import{d as c,f as p,g as d,$ as B,e as g,I as n,T as M,an as j,ai as b,ak as E,ap as T,w as D}from"./index-C7JpK5Nd.js";import{T as l}from"./textarea-CJbm1bUG.js";import{L as i}from"./label-DUkIsdlE.js";import{S as I,a as O,b as L,c as R,d as h}from"./select-Bk9iz0XS.js";import{u as P,A as W}from"./useDocFormDraft-Bud_LrlS.js";import{A as y}from"./AISuggestionButton-BhvECRL_.js";import{B as G}from"./building-2-BmuadVeQ.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./react-vendor-CtFdHvrH.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";const H=r.object({company_name:r.string().min(1,"Company name is required"),industry:r.string().min(1,"Industry is required"),report_date:r.string(),prepared_by:r.string().optional(),market_name:r.string().min(1,"Market name is required"),market_description:r.string().min(20,"Please provide a market description"),geographic_focus:r.string().min(1,"Geographic focus is required"),tam_value:r.number().min(0).optional(),sam_value:r.number().min(0).optional(),som_value:r.number().min(0).optional(),market_size_year:r.number().min(2020).max(2030),market_growth_rate:r.number().min(-50).max(200).optional(),target_customer_description:r.string().min(10,"Describe your target customer"),customer_pain_points:r.string().min(10,"Describe customer pain points"),customer_demographics:r.string().optional(),competition_level:r.enum(["low","medium","high","very_high"]),main_competitors:r.string().optional(),competitive_advantages:r.string().min(10,"Describe your competitive advantages"),market_trends:r.string().min(10,"Describe key market trends"),opportunities:r.string().optional(),threats:r.string().optional(),strengths:r.string().optional(),weaknesses:r.string().optional(),recommendations:r.string().optional(),sources:r.string().optional()});function x(m){return m?m>=1e12?`$${(m/1e12).toFixed(1)}T`:m>=1e9?`$${(m/1e9).toFixed(1)}B`:m>=1e6?`$${(m/1e6).toFixed(1)}M`:m>=1e3?`$${(m/1e3).toFixed(1)}K`:`$${m.toLocaleString()}`:"$0"}function ce({template:m,onGenerate:F,onPreviewUpdate:_,isGenerating:V}){const t=S({resolver:C(H),defaultValues:{company_name:"",industry:"",report_date:new Date().toISOString().split("T")[0],prepared_by:"",market_name:"",market_description:"",geographic_focus:"United States",tam_value:void 0,sam_value:void 0,som_value:void 0,market_size_year:new Date().getFullYear(),market_growth_rate:void 0,target_customer_description:"",customer_pain_points:"",customer_demographics:"",competition_level:"medium",main_competitors:"",competitive_advantages:"",market_trends:"",opportunities:"",threats:"",strengths:"",weaknesses:"",recommendations:"",sources:""}});P({form:t,templateId:"market-analysis"});const{watch:k,setValue:o,handleSubmit:N,formState:{errors:q}}=t,a=k(),f=u.useCallback(()=>{const s=a,$={low:"Low Competition",medium:"Moderate Competition",high:"High Competition",very_high:"Extremely High Competition"}[s.competition_level],v={low:"#10B981",medium:"#F59E0B",high:"#EF4444",very_high:"#DC2626"}[s.competition_level],z=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
        <div style="margin-bottom: 40px; border-bottom: 4px solid #3B82F6; padding-bottom: 20px;">
          <p style="color: #64748B; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Market Analysis Report</p>
          <h1 style="font-family: 'Sora', sans-serif; font-size: 32px; margin: 0 0 12px 0; color: #0F172A; font-weight: 700; letter-spacing: -0.02em;">${s.market_name||"[Market Name]"}</h1>
          <p style="color: #64748B; margin: 0; font-size: 14px;">
            Prepared for <strong>${s.company_name||"[Company]"}</strong> • ${s.report_date||new Date().toLocaleDateString()}
            ${s.prepared_by?` • By ${s.prepared_by}`:""}
          </p>
        </div>
        
        <section style="margin-bottom: 40px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.01em;">
            Market Overview
          </h2>
          <div style="padding: 20px; background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border-radius: 12px; border-left: 4px solid #3B82F6;">
            <p style="line-height: 1.8; margin: 0; color: #334155;">${s.market_description||"[Describe the market]"}</p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #64748B;">
              <strong>Industry:</strong> ${s.industry||"[Industry]"} • 
              <strong>Region:</strong> ${s.geographic_focus||"[Region]"}
            </p>
          </div>
        </section>
        
        <section style="margin-bottom: 40px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.01em;">
            Market Size (${s.market_size_year||"Current"})
          </h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
            <div style="padding: 24px; background: #EFF6FF; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #3B82F6; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">TAM</p>
              <p style="font-size: 28px; font-weight: 700; margin: 0; color: #1E40AF; font-family: 'JetBrains Mono', monospace;">${x(s.tam_value)}</p>
              <p style="font-size: 11px; color: #64748B; margin: 8px 0 0 0;">Total Addressable Market</p>
            </div>
            <div style="padding: 24px; background: #F0FDF4; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #10B981; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">SAM</p>
              <p style="font-size: 28px; font-weight: 700; margin: 0; color: #166534; font-family: 'JetBrains Mono', monospace;">${x(s.sam_value)}</p>
              <p style="font-size: 11px; color: #64748B; margin: 8px 0 0 0;">Serviceable Addressable Market</p>
            </div>
            <div style="padding: 24px; background: #FEF3C7; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #F59E0B; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">SOM</p>
              <p style="font-size: 28px; font-weight: 700; margin: 0; color: #92400E; font-family: 'JetBrains Mono', monospace;">${x(s.som_value)}</p>
              <p style="font-size: 11px; color: #64748B; margin: 8px 0 0 0;">Serviceable Obtainable Market</p>
            </div>
          </div>
          ${s.market_growth_rate?`
          <div style="margin-top: 16px; padding: 12px 16px; background: #F8FAFC; border-radius: 8px;">
            <span style="font-size: 14px; color: #334155;">Projected annual growth rate: <strong style="color: ${(s.market_growth_rate||0)>0?"#10B981":"#EF4444"};">${s.market_growth_rate}%</strong></span>
          </div>`:""}
        </section>
        
        <section style="margin-bottom: 40px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.01em;">
            Target Customer
          </h2>
          <div style="padding: 20px; background: #F8FAFC; border-radius: 12px; border-left: 4px solid #10B981;">
            <h3 style="font-size: 16px; color: #0F172A; margin: 0 0 12px 0;">Customer Profile</h3>
            <p style="line-height: 1.8; margin: 0; color: #334155;">${s.target_customer_description||"[Describe target customer]"}</p>
            ${s.customer_demographics?`<p style="margin: 12px 0 0 0; font-size: 13px; color: #64748B;"><strong>Demographics:</strong> ${s.customer_demographics}</p>`:""}
          </div>
          <div style="margin-top: 16px; padding: 20px; background: #FEF2F2; border-radius: 12px; border-left: 4px solid #EF4444;">
            <h3 style="font-size: 16px; color: #0F172A; margin: 0 0 12px 0;">Pain Points</h3>
            <p style="line-height: 1.8; margin: 0; color: #334155;">${s.customer_pain_points||"[Describe pain points]"}</p>
          </div>
        </section>
        
        <section style="margin-bottom: 40px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.01em;">
            Competitive Landscape
          </h2>
          <div style="padding: 16px 20px; background: #F8FAFC; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 14px; color: #334155;">Competition Level:</span>
            <span style="padding: 6px 16px; background: ${v}20; color: ${v}; border-radius: 20px; font-weight: 600; font-size: 13px;">${$}</span>
          </div>
          ${s.main_competitors?`
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 14px; color: #64748B; margin: 0 0 8px 0;">Key Competitors</h3>
            <p style="line-height: 1.7; color: #334155; margin: 0;">${s.main_competitors}</p>
          </div>`:""}
          <div style="padding: 20px; background: #EFF6FF; border-radius: 12px; border-left: 4px solid #3B82F6;">
            <h3 style="font-size: 16px; color: #1E40AF; margin: 0 0 12px 0;">Our Competitive Advantages</h3>
            <p style="line-height: 1.8; margin: 0; color: #334155;">${s.competitive_advantages||"[Describe advantages]"}</p>
          </div>
        </section>
        
        <section style="margin-bottom: 40px;">
          <h2 style="font-family: 'Sora', sans-serif; font-size: 20px; color: #0F172A; margin-bottom: 16px; letter-spacing: -0.01em;">
            Market Trends
          </h2>
          <p style="line-height: 1.8; color: #334155;">${s.market_trends||"[Describe market trends]"}</p>
        </section>
        
        ${s.opportunities||s.threats?`
        <section style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; color: #0F172A; margin-bottom: 16px;">Opportunities & Threats</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${s.opportunities?`
            <div style="padding: 20px; background: #F0FDF4; border-radius: 12px; border-top: 4px solid #10B981;">
              <h3 style="font-size: 14px; color: #166534; margin: 0 0 12px 0;">
                Opportunities
              </h3>
              <p style="line-height: 1.7; margin: 0; color: #334155; font-size: 14px;">${s.opportunities}</p>
            </div>`:""}
            ${s.threats?`
            <div style="padding: 20px; background: #FEF2F2; border-radius: 12px; border-top: 4px solid #EF4444;">
              <h3 style="font-size: 14px; color: #991B1B; margin: 0 0 12px 0;">
                Threats
              </h3>
              <p style="line-height: 1.7; margin: 0; color: #334155; font-size: 14px;">${s.threats}</p>
            </div>`:""}
          </div>
        </section>`:""}
        
        ${s.strengths||s.weaknesses?`
        <section style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; color: #0F172A; margin-bottom: 16px;">SWOT Analysis (Partial)</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${s.strengths?`
            <div style="padding: 20px; background: #EFF6FF; border-radius: 12px;">
              <h3 style="font-size: 14px; color: #1E40AF; margin: 0 0 12px 0;">Strengths</h3>
              <p style="line-height: 1.7; margin: 0; color: #334155; font-size: 14px;">${s.strengths}</p>
            </div>`:""}
            ${s.weaknesses?`
            <div style="padding: 20px; background: #FEF3C7; border-radius: 12px;">
              <h3 style="font-size: 14px; color: #92400E; margin: 0 0 12px 0;">Weaknesses</h3>
              <p style="line-height: 1.7; margin: 0; color: #334155; font-size: 14px;">${s.weaknesses}</p>
            </div>`:""}
          </div>
        </section>`:""}
        
        ${s.recommendations?`
        <section style="margin-bottom: 40px;">
          <h2 style="font-size: 20px; color: #0F172A; margin-bottom: 16px;">
            Recommendations
          </h2>
          <div style="padding: 20px; background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); border-radius: 12px; color: white;">
            <p style="line-height: 1.8; margin: 0;">${s.recommendations}</p>
          </div>
        </section>`:""}
        
        ${s.sources?`
        <section style="margin-bottom: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <h3 style="font-size: 14px; color: #64748B; margin: 0 0 12px 0;">Sources & References</h3>
          <p style="font-size: 12px; color: #94A3B8; line-height: 1.6; margin: 0;">${s.sources}</p>
        </section>`:""}
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 11px;">
          Generated with AIWMC Quantis | aiwmcquantis.com
        </footer>
      </div>
    `;_(z)},[a,_]);u.useEffect(()=>{f()},[f]);const w=u.useCallback(s=>{s.company_name&&o("company_name",String(s.company_name)),s.industry&&o("industry",String(s.industry)),s.market_name&&o("market_name",String(s.market_name)),s.tam&&o("tam_value",Number(s.tam)),s.sam&&o("sam_value",Number(s.sam)),s.som&&o("som_value",Number(s.som)),s.growth_rate&&o("market_growth_rate",Number(s.growth_rate))},[o]),A=s=>{F(s)};return e.jsxs("form",{onSubmit:N(A),className:"space-y-6",children:[e.jsx(W,{onAutoFill:w}),e.jsxs(c,{className:"doc-section-card",children:[e.jsx(p,{children:e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(B,{className:"w-5 h-5 text-primary"}),"Report Information"]})}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"company_name",children:"Company Name *"}),e.jsx(n,{id:"company_name",...t.register("company_name"),placeholder:"Your Company"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"industry",children:"Industry *"}),e.jsx(n,{id:"industry",...t.register("industry"),placeholder:"e.g., SaaS, Healthcare, FinTech"})]})]}),e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"report_date",children:"Report Date"}),e.jsx(n,{id:"report_date",type:"date",...t.register("report_date")})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"prepared_by",children:"Prepared By"}),e.jsx(n,{id:"prepared_by",...t.register("prepared_by"),placeholder:"Analyst name"})]})]})]})]}),e.jsxs(c,{className:"doc-section-card",children:[e.jsx(p,{children:e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(M,{className:"w-5 h-5 text-primary"}),"Market Overview"]})}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"market_name",children:"Market Name *"}),e.jsx(n,{id:"market_name",...t.register("market_name"),placeholder:"e.g., Enterprise AI Solutions"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"geographic_focus",children:"Geographic Focus *"}),e.jsx(n,{id:"geographic_focus",...t.register("geographic_focus"),placeholder:"e.g., North America, Global"})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(i,{htmlFor:"market_description",children:"Market Description *"}),e.jsx(y,{sectionType:"market_description",context:{market_name:a.market_name,industry:a.industry},onApply:s=>o("market_description",s)})]}),e.jsx(l,{id:"market_description",...t.register("market_description"),placeholder:"Describe the market, its current state, and key characteristics...",rows:4})]})]})]}),e.jsxs(c,{className:"doc-section-card",children:[e.jsxs(p,{children:[e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(j,{className:"w-5 h-5 text-primary"}),"Market Size (TAM/SAM/SOM)"]}),e.jsx(b,{children:"Enter values in USD (e.g., 1000000000 for $1B)"})]}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 sm:grid-cols-2 lg:grid-cols-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"tam_value",children:"TAM ($)"}),e.jsx(n,{id:"tam_value",type:"number",...t.register("tam_value",{valueAsNumber:!0}),placeholder:"Total Addressable"}),a.tam_value&&e.jsx("p",{className:"text-xs text-muted-foreground",children:x(a.tam_value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"sam_value",children:"SAM ($)"}),e.jsx(n,{id:"sam_value",type:"number",...t.register("sam_value",{valueAsNumber:!0}),placeholder:"Serviceable Addressable"}),a.sam_value&&e.jsx("p",{className:"text-xs text-muted-foreground",children:x(a.sam_value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"som_value",children:"SOM ($)"}),e.jsx(n,{id:"som_value",type:"number",...t.register("som_value",{valueAsNumber:!0}),placeholder:"Obtainable"}),a.som_value&&e.jsx("p",{className:"text-xs text-muted-foreground",children:x(a.som_value)})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"market_growth_rate",children:"Growth Rate (%)"}),e.jsx(n,{id:"market_growth_rate",type:"number",...t.register("market_growth_rate",{valueAsNumber:!0}),placeholder:"Annual CAGR"})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"market_size_year",children:"Year"}),e.jsx(n,{id:"market_size_year",type:"number",...t.register("market_size_year",{valueAsNumber:!0}),min:2020,max:2030,className:"w-32"})]})]})]}),e.jsxs(c,{className:"doc-section-card",children:[e.jsx(p,{children:e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(E,{className:"w-5 h-5 text-primary"}),"Target Customer"]})}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"target_customer_description",children:"Customer Profile *"}),e.jsx(l,{id:"target_customer_description",...t.register("target_customer_description"),placeholder:"Describe your ideal customer (company size, industry, decision makers)...",rows:3})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"customer_pain_points",children:"Pain Points *"}),e.jsx(l,{id:"customer_pain_points",...t.register("customer_pain_points"),placeholder:"What problems does your target customer face that you solve?",rows:3})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"customer_demographics",children:"Demographics (Optional)"}),e.jsx(n,{id:"customer_demographics",...t.register("customer_demographics"),placeholder:"e.g., Mid-market companies, 50-500 employees, $10M-$100M revenue"})]})]})]}),e.jsxs(c,{className:"doc-section-card",children:[e.jsx(p,{children:e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(G,{className:"w-5 h-5 text-primary"}),"Competitive Landscape"]})}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"competition_level",children:"Competition Level *"}),e.jsxs(I,{value:a.competition_level,onValueChange:s=>o("competition_level",s),children:[e.jsx(O,{id:"competition_level",children:e.jsx(L,{})}),e.jsxs(R,{children:[e.jsx(h,{value:"low",children:"Low - Few direct competitors"}),e.jsx(h,{value:"medium",children:"Medium - Established players exist"}),e.jsx(h,{value:"high",children:"High - Crowded market"}),e.jsx(h,{value:"very_high",children:"Very High - Dominated by major players"})]})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"main_competitors",children:"Key Competitors"}),e.jsx(l,{id:"main_competitors",...t.register("main_competitors"),placeholder:"List main competitors and their strengths/weaknesses...",rows:3})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(i,{htmlFor:"competitive_advantages",children:"Your Competitive Advantages *"}),e.jsx(y,{sectionType:"competitive_advantage",context:{company_name:a.company_name,industry:a.industry,competitors:a.main_competitors},onApply:s=>o("competitive_advantages",s)})]}),e.jsx(l,{id:"competitive_advantages",...t.register("competitive_advantages"),placeholder:"What makes you different? Why would customers choose you?",rows:3})]})]})]}),e.jsxs(c,{className:"doc-section-card",children:[e.jsx(p,{children:e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(T,{className:"w-5 h-5 text-primary"}),"Trends & Analysis"]})}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(i,{htmlFor:"market_trends",children:"Market Trends *"}),e.jsx(y,{sectionType:"market_trends",context:{market_name:a.market_name,industry:a.industry},onApply:s=>o("market_trends",s)})]}),e.jsx(l,{id:"market_trends",...t.register("market_trends"),placeholder:"Key trends shaping this market (technology, regulation, consumer behavior)...",rows:4})]}),e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"opportunities",children:"Opportunities"}),e.jsx(l,{id:"opportunities",...t.register("opportunities"),placeholder:"Market opportunities to capitalize on...",rows:3})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs(i,{htmlFor:"threats",className:"flex items-center gap-2",children:[e.jsx(D,{className:"w-4 h-4 text-warning"}),"Threats"]}),e.jsx(l,{id:"threats",...t.register("threats"),placeholder:"Potential threats and risks...",rows:3})]})]})]})]}),e.jsxs(c,{className:"doc-section-card",children:[e.jsxs(p,{children:[e.jsxs(d,{className:"flex items-center gap-2 text-lg",children:[e.jsx(j,{className:"w-5 h-5 text-primary"}),"SWOT & Recommendations"]}),e.jsx(b,{children:"Optional strategic analysis"})]}),e.jsxs(g,{className:"space-y-4",children:[e.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"strengths",children:"Strengths"}),e.jsx(l,{id:"strengths",...t.register("strengths"),placeholder:"Internal strengths...",rows:2})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"weaknesses",children:"Weaknesses"}),e.jsx(l,{id:"weaknesses",...t.register("weaknesses"),placeholder:"Internal weaknesses...",rows:2})]})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"recommendations",children:"Strategic Recommendations"}),e.jsx(l,{id:"recommendations",...t.register("recommendations"),placeholder:"Key recommendations based on this analysis...",rows:4})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(i,{htmlFor:"sources",children:"Sources & References"}),e.jsx(l,{id:"sources",...t.register("sources"),placeholder:"List data sources, reports, and references used...",rows:2})]})]})]})]})}export{ce as MarketAnalysisForm};
//# sourceMappingURL=MarketAnalysisForm-C2SBkBaz.js.map
