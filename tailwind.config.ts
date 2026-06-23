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
				sans: ['IBM Plex Sans', 'Cabinet Grotesk', 'DM Sans', ...fontFamily.sans],
				display: ['Cabinet Grotesk', 'IBM Plex Sans', 'Sora', ...fontFamily.sans],
				mono: ['IBM Plex Mono', 'JetBrains Mono', 'Fira Code', ...fontFamily.mono],
				plex: ['IBM Plex Sans', 'system-ui', ...fontFamily.sans],
				cabinet: ['Cabinet Grotesk', 'DM Sans', ...fontFamily.sans],
			},
			colors: {
				// Legacy shadcn tokens
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
				
				// ═══════════════════════════════════════════════
				// QUANTIS DESIGN SYSTEM v2.0 — Trading Terminal
				// ═══════════════════════════════════════════════
				
				// Surface colors
				q: {
					bg: {
						base: 'var(--q-bg-base)',
						surface: 'var(--q-bg-surface)',
						elevated: 'var(--q-bg-elevated)',
						overlay: 'var(--q-bg-overlay)',
						input: 'var(--q-bg-input)'
					},
					border: {
						subtle: 'var(--q-border-subtle)',
						DEFAULT: 'var(--q-border-default)',
						strong: 'var(--q-border-strong)'
					},
					text: {
						primary: 'var(--q-text-primary)',
						secondary: 'var(--q-text-secondary)',
						tertiary: 'var(--q-text-tertiary)',
						disabled: 'var(--q-text-disabled)',
						inverse: 'var(--q-text-inverse)'
					},
					accent: {
						DEFAULT: 'var(--q-accent-primary)',
						glow: 'var(--q-accent-glow)',
						hover: 'var(--q-accent-hover)',
						pressed: 'var(--q-accent-pressed)'
					},
					status: {
						green: {
							DEFAULT: 'var(--q-status-green)',
							bg: 'var(--q-status-green-bg)',
							border: 'var(--q-status-green-border)'
						},
						yellow: {
							DEFAULT: 'var(--q-status-yellow)',
							bg: 'var(--q-status-yellow-bg)',
							border: 'var(--q-status-yellow-border)'
						},
						red: {
							DEFAULT: 'var(--q-status-red)',
							bg: 'var(--q-status-red-bg)',
							border: 'var(--q-status-red-border)'
						},
						orange: {
							DEFAULT: 'var(--q-status-orange)',
							bg: 'var(--q-status-orange-bg)',
							border: 'var(--q-status-orange-border)'
						},
						ai: {
							DEFAULT: 'var(--q-status-ai)',
							bg: 'var(--q-status-ai-bg)',
							border: 'var(--q-status-ai-border)'
						}
					},
					chart: {
						'1': 'var(--q-chart-1)',
						'2': 'var(--q-chart-2)',
						'3': 'var(--q-chart-3)',
						'4': 'var(--q-chart-4)',
						'5': 'var(--q-chart-5)',
						corridor: 'var(--q-chart-corridor-fill)'
					}
				},
				// AIWMC Brand Colors (cross-product)
				aiwmc: {
					green: 'var(--aiwmc-green, #8FFF2A)',
					'green-dark': 'var(--aiwmc-green-dark, #6ECC1A)',
					purple: 'var(--aiwmc-purple, #8B5CF6)',
					blue: 'var(--aiwmc-blue, #3B82F6)',
					black: 'var(--aiwmc-black, #0A0A0A)',
					white: 'var(--aiwmc-white, #F7F7F5)',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'q-sm': 'var(--q-radius-sm)',
				'q-md': 'var(--q-radius-md)',
				'q-lg': 'var(--q-radius-lg)',
				'q-xl': 'var(--q-radius-xl)',
				'q-pill': 'var(--q-radius-pill)'
			},
			boxShadow: {
				'q-card': 'var(--q-shadow-card)',
				'q-elevated': 'var(--q-shadow-elevated)',
				'q-glow-blue': 'var(--q-shadow-glow-blue)',
				'q-glow-green': 'var(--q-shadow-glow-green)'
			},
			backgroundImage: {
				'q-gradient-hero': 'var(--q-gradient-hero)',
				'q-gradient-card': 'var(--q-gradient-card)',
				'q-gradient-accent': 'var(--q-gradient-accent)',
				'q-gradient-danger': 'var(--q-gradient-danger)',
				'q-gradient-success': 'var(--q-gradient-success)'
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
					'0%, 100%': { boxShadow: 'var(--q-shadow-glow-blue)' },
					'50%': { boxShadow: '0 0 40px rgba(79,142,247,0.35)' }
				},
				'metric-flash': {
					'0%': { backgroundColor: 'transparent' },
					'15%': { backgroundColor: 'var(--q-status-green-bg)' },
					'100%': { backgroundColor: 'transparent' }
				},
				'terminal-blink': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0' }
				},
				'data-pulse': {
					'0%': { transform: 'scale(1)', opacity: '0.8' },
					'50%': { transform: 'scale(1.02)', opacity: '1' },
					'100%': { transform: 'scale(1)', opacity: '0.8' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'count-up': 'count-up 0.5s ease-out',
				'score-reveal': 'score-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'metric-flash': 'metric-flash 1s ease-out',
				'terminal-blink': 'terminal-blink 1s step-end infinite',
				'data-pulse': 'data-pulse 3s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
