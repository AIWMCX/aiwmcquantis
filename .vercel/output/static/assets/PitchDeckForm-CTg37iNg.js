import{r as h,j as e}from"./ui-vendor-Ci_jhfUT.js";import{e as E,s as O}from"./DocsStudio-Cr5akC9A.js";import{u as B,z as r}from"./forms-5vTbOgwK.js";import{t as V}from"./zod-DDx_hEyQ.js";import{u as q,A as H}from"./useDocFormDraft-Bud_LrlS.js";import{A as L}from"./AISuggestionButton-BhvECRL_.js";import{D as Y}from"./DocDraftBanner-WLCzG5c7.js";import{c as W,d,f as m,g as c,ai as p,e as x,I as n,an as K,T as w,am as j,ak as k}from"./index-C7JpK5Nd.js";import{T as l}from"./textarea-CJbm1bUG.js";import{L as t}from"./label-DUkIsdlE.js";import{R as U}from"./rocket-Die9-6_-.js";import"./supabase-vendor-BXGp3RFH.js";import"./query-vendor-ouN-jH5-.js";import"./alert-dialog-BKxEo4on.js";import"./select-Bk9iz0XS.js";import"./chevron-down-BeAFGtZg.js";import"./chevron-up-DucWRmDp.js";import"./plus-C_Wh3IXV.js";import"./search-C6zDNM-a.js";import"./copy-DiM9sxD_.js";import"./trash-2-BotGUTT-.js";import"./date-utils-BcDumrce.js";import"./tabs-DKrhxIhe.js";import"./scale-DXtEBmWV.js";import"./eye-off-iRplz8OT.js";import"./react-vendor-CtFdHvrH.js";import"./dialog-CtleFdjJ.js";import"./calendar-Bqj7sfJ9.js";import"./rotate-ccw-Y5oj2zEL.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G=W("Presentation",[["path",{d:"M2 3h20",key:"91anmk"}],["path",{d:"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3",key:"2k9sn8"}],["path",{d:"m7 21 5-5 5 5",key:"bip4we"}]]),J=r.object({company_name:r.string().min(2,"Company name required"),tagline:r.string().min(5,"Tagline required"),presenter_name:r.string().min(2,"Presenter name required"),presenter_title:r.string().min(2,"Title required"),problem_headline:r.string().min(5,"Problem headline required"),problem_description:r.string().min(30,"Describe the problem"),problem_impact:r.string().min(10,"Describe the impact"),solution_headline:r.string().min(5,"Solution headline required"),solution_description:r.string().min(30,"Describe your solution"),key_features:r.string().min(10,"List key features"),market_size_tam:r.number().min(0),market_size_sam:r.number().min(0),market_size_som:r.number().min(0),market_growth_rate:r.number().min(0).max(500),revenue_model:r.string().min(10,"Revenue model required"),average_deal_size:r.number().min(0),target_customers:r.string().min(10,"Target customers required"),traction_metrics:r.string().min(10,"Traction metrics required"),key_customers:r.string().optional(),growth_rate:r.string().optional(),competitors:r.string().min(10,"List competitors"),differentiation:r.string().min(20,"Differentiation required"),team_members:r.string().min(10,"Team info required"),advisors:r.string().optional(),current_revenue:r.number().min(0),year1_projection:r.number().min(0),year3_projection:r.number().min(0),funding_amount:r.number().min(0),use_of_funds:r.string().min(10,"Use of funds required"),milestones:r.string().min(10,"Milestones required")});function ze({template:z,onGenerate:F,onPreviewUpdate:_,isGenerating:S}){const v=h.useMemo(()=>({company_name:"",tagline:"",presenter_name:"",presenter_title:"",problem_headline:"",problem_description:"",problem_impact:"",solution_headline:"",solution_description:"",key_features:"",market_size_tam:0,market_size_sam:0,market_size_som:0,market_growth_rate:0,revenue_model:"",average_deal_size:0,target_customers:"",traction_metrics:"",key_customers:"",growth_rate:"",competitors:"",differentiation:"",team_members:"",advisors:"",current_revenue:0,year1_projection:0,year3_projection:0,funding_amount:0,use_of_funds:"",milestones:""}),[z]),s=B({resolver:V(J),defaultValues:v}),{hasDraft:T,draftAge:$,isSaving:M,lastSaved:A,restoreDraft:C,dismissDraft:R}=q({form:s,templateId:"pitch-deck"}),b=h.useRef(v),u=h.useRef();h.useEffect(()=>{const a=s.watch(o=>{b.current=o,u.current&&clearTimeout(u.current),u.current=setTimeout(()=>{N(b.current)},300)});return N(s.getValues()),()=>{a.unsubscribe(),u.current&&clearTimeout(u.current)}},[s,_]);const N=h.useCallback(a=>{const o={company_name:"",tagline:"",presenter_name:"",presenter_title:"",problem_headline:"",problem_description:"",problem_impact:"",solution_headline:"",solution_description:"",key_features:"",market_size_tam:0,market_size_sam:0,market_size_som:0,market_growth_rate:0,revenue_model:"",average_deal_size:0,target_customers:"",traction_metrics:"",key_customers:"",growth_rate:"",competitors:"",differentiation:"",team_members:"",advisors:"",current_revenue:0,year1_projection:0,year3_projection:0,funding_amount:0,use_of_funds:"",milestones:"",...a},i=E(o),g=f=>`$${f.toLocaleString("en-US")}`,y=f=>f>=1e9?`$${(f/1e9).toFixed(1)}B`:`$${(f/1e6).toFixed(0)}M`,I=`
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937;">
        
        <!-- Slide 1: Cover -->
        <div style="min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 48px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: 2px; margin: 0 0 16px 0; opacity: 0.8; text-transform: uppercase; font-weight: 600;">INVESTOR PITCH DECK</p>
          <h1 style="font-family: 'Sora', sans-serif; font-size: 48px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.02em;">${i.company_name||"Company Name"}</h1>
          <p style="font-size: 20px; margin: 0 0 32px 0; opacity: 0.9;">${i.tagline||"Tagline"}</p>
          <div style="margin-top: 48px;">
            <p style="margin: 0; font-size: 14px;">${i.presenter_name||"Name"} • ${i.presenter_title||"Title"}</p>
          </div>
        </div>

        <!-- Slide 2: Problem -->
        <div style="padding: 32px; background: #fef2f2; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #dc2626; font-weight: 600; margin: 0 0 8px 0;">THE PROBLEM</p>
          <h2 style="font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 700; color: #dc2626; margin: 0 0 16px 0; letter-spacing: -0.02em;">${i.problem_headline||"Problem"}</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">${i.problem_description||""}</p>
          <div style="padding: 16px; background: white; border-radius: 8px; font-weight: 600; color: #dc2626;">
            Impact: ${i.problem_impact||""}
          </div>
        </div>

        <!-- Slide 3: Solution -->
        <div style="padding: 32px; background: #ecfdf5; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #10b981; font-weight: 600; margin: 0 0 8px 0;">OUR SOLUTION</p>
          <h2 style="font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 700; color: #10b981; margin: 0 0 16px 0; letter-spacing: -0.02em;">${i.solution_headline||"Solution"}</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">${i.solution_description||""}</p>
          <div style="padding: 16px; background: white; border-radius: 8px; white-space: pre-line;">
            ${i.key_features||""}
          </div>
        </div>

        <!-- Slide 4: Market -->
        <div style="padding: 32px; background: #f0f9ff; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #2563eb; font-weight: 600; margin: 0 0 8px 0;">MARKET OPPORTUNITY</p>
          <h2 style="font-family: 'Sora', sans-serif; font-size: 32px; font-weight: 700; color: #2563eb; margin: 0 0 24px 0; letter-spacing: -0.02em;">TAM / SAM / SOM</h2>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">TAM</p>
              <p style="font-size: 36px; font-weight: 700; color: #2563eb; margin: 8px 0; font-family: 'JetBrains Mono', monospace;">${y(o.market_size_tam||0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">SAM</p>
              <p style="font-size: 36px; font-weight: 700; color: #2563eb; margin: 8px 0; font-family: 'JetBrains Mono', monospace;">${y(o.market_size_sam||0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">SOM</p>
              <p style="font-size: 36px; font-weight: 700; color: #2563eb; margin: 8px 0; font-family: 'JetBrains Mono', monospace;">${y(o.market_size_som||0)}</p>
            </div>
          </div>
          <p style="text-align: center; margin-top: 16px; font-size: 14px; color: #6b7280;">
            Market growing at <strong style="color: #2563eb;">${i.market_growth_rate||0}% CAGR</strong>
          </p>
        </div>

        <!-- Slide 5: Business Model -->
        <div style="padding: 32px; background: #fefce8; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #ca8a04; font-weight: 600; margin: 0 0 8px 0;">BUSINESS MODEL</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #ca8a04; margin: 0 0 24px 0;">How We Make Money</h2>
          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Revenue Model:</strong> ${i.revenue_model||""}
            </div>
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Average Deal Size:</strong> ${g(o.average_deal_size||0)}/year
            </div>
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Target Customers:</strong> ${i.target_customers||""}
            </div>
          </div>
        </div>

        <!-- Slide 6: Traction -->
        <div style="padding: 32px; background: #f0fdf4; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #16a34a; font-weight: 600; margin: 0 0 8px 0;">TRACTION</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #16a34a; margin: 0 0 24px 0;">Proof Points</h2>
          <div style="padding: 16px; background: white; border-radius: 8px; white-space: pre-line; margin-bottom: 16px;">
            ${i.traction_metrics||""}
          </div>
          ${i.key_customers?`<p><strong>Key Customers:</strong> ${i.key_customers}</p>`:""}
          ${i.growth_rate?`<p><strong>Growth:</strong> ${i.growth_rate}</p>`:""}
        </div>

        <!-- Slide 7: Competition -->
        <div style="padding: 32px; background: #fff7ed; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #ea580c; font-weight: 600; margin: 0 0 8px 0;">COMPETITIVE LANDSCAPE</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #ea580c; margin: 0 0 24px 0;">Why We Win</h2>
          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Competitors:</strong> ${i.competitors||""}
            </div>
            <div style="padding: 16px; background: #ea580c; color: white; border-radius: 8px;">
              <strong>Our Differentiation:</strong> ${i.differentiation||""}
            </div>
          </div>
        </div>

        <!-- Slide 8: Team -->
        <div style="padding: 32px; background: #faf5ff; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #9333ea; font-weight: 600; margin: 0 0 8px 0;">THE TEAM</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #9333ea; margin: 0 0 24px 0;">Who's Building This</h2>
          <div style="padding: 16px; background: white; border-radius: 8px; white-space: pre-line; margin-bottom: 16px;">
            ${i.team_members||""}
          </div>
          ${i.advisors?`<p style="color: #6b7280;"><strong>Advisors:</strong> ${i.advisors}</p>`:""}
        </div>

        <!-- Slide 9: Financials -->
        <div style="padding: 32px; background: #f0f9ff; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #2563eb; font-weight: 600; margin: 0 0 8px 0;">FINANCIAL PROJECTIONS</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 0 0 24px 0;">Path to Scale</h2>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Current ARR</p>
              <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 8px 0; font-family: 'JetBrains Mono', monospace;">${g(o.current_revenue||0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Year 1</p>
              <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 8px 0; font-family: 'JetBrains Mono', monospace;">${g(o.year1_projection||0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Year 3</p>
              <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 8px 0; font-family: 'JetBrains Mono', monospace;">${g(o.year3_projection||0)}</p>
            </div>
          </div>
        </div>

        <!-- Slide 10: The Ask -->
        <div style="min-height: 400px; display: flex; flex-direction: column; justify-content: center; padding: 48px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; letter-spacing: 2px; margin: 0 0 16px 0; opacity: 0.8;">THE ASK</p>
          <h2 style="font-size: 48px; font-weight: 700; margin: 0 0 32px 0;">${g(o.funding_amount||0)}</h2>
          
          <div style="display: grid; gap: 24px;">
            <div>
              <p style="font-size: 14px; opacity: 0.8; margin: 0 0 8px 0;">Use of Funds:</p>
              <p style="font-size: 16px; white-space: pre-line; margin: 0;">${i.use_of_funds||""}</p>
            </div>
            <div>
              <p style="font-size: 14px; opacity: 0.8; margin: 0 0 8px 0;">Key Milestones:</p>
              <p style="font-size: 16px; white-space: pre-line; margin: 0;">${i.milestones||""}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Confidential - ${i.company_name||"Company"} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;_(O(I))},[_]),D=a=>{F(a)},P=h.useCallback(a=>{a.company_name&&s.setValue("company_name",a.company_name),a.monthly_revenue&&(s.setValue("current_revenue",a.monthly_revenue*12),s.setValue("year1_projection",a.monthly_revenue*12*3),s.setValue("year3_projection",a.monthly_revenue*12*10))},[s]);return e.jsxs("form",{onSubmit:s.handleSubmit(D),className:"space-y-6","aria-label":"Pitch Deck Generator Form",children:[e.jsx(Y,{hasDraft:T,draftAge:$,isSaving:M,lastSaved:A,onRestore:C,onDismiss:R}),e.jsx("div",{className:"flex items-center justify-between",children:e.jsx(H,{onAutoFill:P,disabled:S})}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(G,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Cover Slide"]}),e.jsx(p,{children:"Your opening slide that sets the tone"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"company_name",children:["Company Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"company_name",...s.register("company_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"tagline",children:["Tagline ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"tagline",...s.register("tagline"),className:"mt-1"})]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"presenter_name",children:["Presenter Name ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"presenter_name",...s.register("presenter_name"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"presenter_title",children:["Title ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"presenter_title",...s.register("presenter_title"),className:"mt-1"})]})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(K,{className:"w-5 h-5 text-destructive","aria-hidden":"true"}),"The Problem"]}),e.jsx(p,{children:"What pain point are you addressing?"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"problem_headline",children:["Problem Headline ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"problem_headline",...s.register("problem_headline"),className:"mt-1",placeholder:"A bold statement about the problem"})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-1",children:[e.jsxs(t,{htmlFor:"problem_description",children:["Problem Description ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(L,{sectionType:"market_analysis",context:{business_name:s.getValues("company_name")},onApply:a=>s.setValue("problem_description",a)})]}),e.jsx(l,{id:"problem_description",...s.register("problem_description"),rows:3,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"problem_impact",children:["Impact / Stats ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"problem_impact",...s.register("problem_impact"),className:"mt-1",placeholder:"$X billion lost annually, Y% failure rate"})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(U,{className:"w-5 h-5 text-success","aria-hidden":"true"}),"Your Solution"]}),e.jsx(p,{children:"How do you solve the problem?"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"solution_headline",children:["Solution Headline ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"solution_headline",...s.register("solution_headline"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"solution_description",children:["Solution Description ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"solution_description",...s.register("solution_description"),rows:3,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"key_features",children:["Key Features (one per line) ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"key_features",...s.register("key_features"),rows:4,className:"mt-1",placeholder:`• Feature 1
• Feature 2
• Feature 3`})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(w,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Market Opportunity"]}),e.jsx(p,{children:"TAM / SAM / SOM analysis"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(t,{htmlFor:"market_size_tam",children:"TAM ($)"}),e.jsx(n,{id:"market_size_tam",type:"number",...s.register("market_size_tam",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"market_size_sam",children:"SAM ($)"}),e.jsx(n,{id:"market_size_sam",type:"number",...s.register("market_size_sam",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"market_size_som",children:"SOM ($)"}),e.jsx(n,{id:"market_size_som",type:"number",...s.register("market_size_som",{valueAsNumber:!0}),className:"mt-1"})]})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"market_growth_rate",children:"Market Growth Rate (% CAGR)"}),e.jsx(n,{id:"market_growth_rate",type:"number",...s.register("market_growth_rate",{valueAsNumber:!0}),className:"mt-1"})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(j,{className:"w-5 h-5 text-warning","aria-hidden":"true"}),"Business Model"]}),e.jsx(p,{children:"How you make money"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"revenue_model",children:["Revenue Model ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"revenue_model",...s.register("revenue_model"),rows:2,className:"mt-1"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(t,{htmlFor:"average_deal_size",children:"Average Deal Size ($/year)"}),e.jsx(n,{id:"average_deal_size",type:"number",...s.register("average_deal_size",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"target_customers",children:["Target Customers ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(n,{id:"target_customers",...s.register("target_customers"),className:"mt-1"})]})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(w,{className:"w-5 h-5 text-success","aria-hidden":"true"}),"Traction"]}),e.jsx(p,{children:"Proof that your business is working"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"traction_metrics",children:["Key Metrics (one per line) ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"traction_metrics",...s.register("traction_metrics"),rows:4,className:"mt-1",placeholder:`• $X ARR
• Y customers
• Z% growth`})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx(t,{htmlFor:"key_customers",children:"Key Customers"}),e.jsx(n,{id:"key_customers",...s.register("key_customers"),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"growth_rate",children:"Growth Rate"}),e.jsx(n,{id:"growth_rate",...s.register("growth_rate"),className:"mt-1",placeholder:"3x YoY"})]})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(k,{className:"w-5 h-5 text-orange-500","aria-hidden":"true"}),"Competition"]}),e.jsx(p,{children:"Who else is in the market?"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"competitors",children:["Competitors ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"competitors",...s.register("competitors"),rows:2,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"differentiation",children:["Your Differentiation ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"differentiation",...s.register("differentiation"),rows:2,className:"mt-1"})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(k,{className:"w-5 h-5 text-purple-500","aria-hidden":"true"}),"Team"]}),e.jsx(p,{children:"Who's building this company?"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"team_members",children:["Team Members (one per line) ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"team_members",...s.register("team_members"),rows:4,className:"mt-1",placeholder:`• Name, Role - Experience
• Name, Role - Experience`})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"advisors",children:"Advisors"}),e.jsx(l,{id:"advisors",...s.register("advisors"),rows:2,className:"mt-1"})]})]})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(j,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"Financial Projections"]}),e.jsx(p,{children:"Revenue trajectory"})]}),e.jsx(x,{className:"space-y-4",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{children:[e.jsx(t,{htmlFor:"current_revenue",children:"Current ARR ($)"}),e.jsx(n,{id:"current_revenue",type:"number",...s.register("current_revenue",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"year1_projection",children:"Year 1 Projection ($)"}),e.jsx(n,{id:"year1_projection",type:"number",...s.register("year1_projection",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsx(t,{htmlFor:"year3_projection",children:"Year 3 Projection ($)"}),e.jsx(n,{id:"year3_projection",type:"number",...s.register("year3_projection",{valueAsNumber:!0}),className:"mt-1"})]})]})})]}),e.jsxs(d,{children:[e.jsxs(m,{children:[e.jsxs(c,{className:"flex items-center gap-2",children:[e.jsx(j,{className:"w-5 h-5 text-primary","aria-hidden":"true"}),"The Ask"]}),e.jsx(p,{children:"What you need from investors"})]}),e.jsxs(x,{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx(t,{htmlFor:"funding_amount",children:"Funding Amount ($)"}),e.jsx(n,{id:"funding_amount",type:"number",...s.register("funding_amount",{valueAsNumber:!0}),className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"use_of_funds",children:["Use of Funds ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"use_of_funds",...s.register("use_of_funds"),rows:3,className:"mt-1"})]}),e.jsxs("div",{children:[e.jsxs(t,{htmlFor:"milestones",children:["Key Milestones ",e.jsx("span",{className:"text-destructive",children:"*"})]}),e.jsx(l,{id:"milestones",...s.register("milestones"),rows:4,className:"mt-1",placeholder:`• Q2: Milestone 1
• Q4: Milestone 2`})]})]})]})]})}export{ze as PitchDeckForm};
//# sourceMappingURL=PitchDeckForm-CTg37iNg.js.map
