import type { Config } from "tailwindcss";
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', ...fontFamily.sans],
				mono: ['JetBrains Mono', 'Fira Code', ...fontFamily.mono],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Quantis Financial Design System
				quantis: {
					profit: {
						DEFAULT: 'hsl(var(--quantis-profit))',
						foreground: 'hsl(var(--quantis-profit-foreground))'
					},
					loss: {
						DEFAULT: 'hsl(var(--quantis-loss))',
						foreground: 'hsl(var(--quantis-loss-foreground))'
					},
					caution: {
						DEFAULT: 'hsl(var(--quantis-caution))',
						foreground: 'hsl(var(--quantis-caution-foreground))'
					},
					neutral: {
						DEFAULT: 'hsl(var(--quantis-neutral))',
						foreground: 'hsl(var(--quantis-neutral-foreground))'
					},
					gold: {
						DEFAULT: 'hsl(var(--quantis-gold))',
						foreground: 'hsl(var(--quantis-gold-foreground))'
					},
					cyan: {
						DEFAULT: 'hsl(var(--quantis-cyan))',
						foreground: 'hsl(var(--quantis-cyan-foreground))'
					},
					chart: {
						'1': 'hsl(var(--quantis-chart-1))',
						'2': 'hsl(var(--quantis-chart-2))',
						'3': 'hsl(var(--quantis-chart-3))',
						'4': 'hsl(var(--quantis-chart-4))',
						'5': 'hsl(var(--quantis-chart-5))'
					},
					surface: {
						raised: 'hsl(var(--quantis-surface-raised))',
						sunken: 'hsl(var(--quantis-surface-sunken))'
					}
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				'quantis-glow': '0 0 30px hsl(var(--quantis-glow-primary) / 0.2)',
				'quantis-glow-profit': '0 0 20px hsl(var(--quantis-glow-profit) / 0.25)',
				'quantis-card': '0 1px 3px hsl(var(--foreground) / 0.05), 0 4px 12px hsl(var(--foreground) / 0.08)',
				'quantis-card-hover': '0 4px 12px hsl(var(--foreground) / 0.08), 0 8px 24px hsl(var(--foreground) / 0.12)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'pulse-subtle': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '.7' }
				},
				'count-up': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'score-reveal': {
					'0%': { transform: 'scale(0.8)', opacity: '0' },
					'50%': { transform: 'scale(1.05)' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 20px hsl(var(--quantis-glow-primary) / 0.2)' },
					'50%': { boxShadow: '0 0 40px hsl(var(--quantis-glow-primary) / 0.35)' }
				},
				'metric-flash': {
					'0%': { backgroundColor: 'transparent' },
					'15%': { backgroundColor: 'hsl(var(--quantis-profit) / 0.15)' },
					'100%': { backgroundColor: 'transparent' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'count-up': 'count-up 0.5s ease-out',
				'score-reveal': 'score-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'metric-flash': 'metric-flash 1s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
