<script lang="ts">
	export let message = 'Loading...';
	export let subtitle = '';
</script>

<div class="loading-container">
	<div class="loading-animation">
		<!-- Simple cycling animation using emoji and CSS -->
		<div class="cycling-scene">
			<div class="weather-icons">
				<div class="weather-icon sun">☀️</div>
				<div class="weather-icon cloud">☁️</div>
				<div class="weather-icon rain">🌧️</div>
			</div>
			<div class="cyclist-emoji">🚴‍♂️</div>
		</div>
	</div>
	
	<div class="loading-text">
		<h2>{message}</h2>
		{#if subtitle}
			<p>{subtitle}</p>
		{/if}
		<div class="dots">
			<span></span>
			<span></span>
			<span></span>
		</div>
	</div>
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%);
		position: relative;
		overflow: hidden;
		padding: 2rem;
	}

	.loading-animation {
		margin-bottom: 2rem;
	}

	.cycling-scene {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 20px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	}

	.cyclist-emoji {
		font-size: 4rem;
		animation: cyclistBounce 1s ease-in-out infinite;
	}

	@keyframes cyclistBounce {
		0%, 100% { 
			transform: translateY(0) scale(1); 
		}
		50% { 
			transform: translateY(-10px) scale(1.05); 
		}
	}

	.weather-icons {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.weather-icon {
		font-size: 2rem;
		opacity: 0.3;
		transition: all 0.5s ease;
		animation: weatherCycle 3s ease-in-out infinite;
	}

	.weather-icon.sun {
		animation-delay: 0s;
	}

	.weather-icon.cloud {
		animation-delay: 1s;
	}

	.weather-icon.rain {
		animation-delay: 2s;
	}

	@keyframes weatherCycle {
		0%, 66%, 100% { 
			opacity: 0.3;
			transform: scale(1);
		}
		33% { 
			opacity: 1;
			transform: scale(1.2);
		}
	}

	/* Loading text */
	.loading-text {
		text-align: center;
		color: #2c3e50;
	}

	.loading-text h2 {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: #1e40af;
	}

	.loading-text p {
		font-size: 1rem;
		margin: 0 0 1.5rem 0;
		opacity: 0.8;
		max-width: 400px;
		color: #374151;
	}

	/* Animated dots */
	.dots {
		display: flex;
		justify-content: center;
		gap: 6px;
	}

	.dots span {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: linear-gradient(135deg, #3b82f6, #1d4ed8);
		animation: dotBounce 1.4s ease-in-out infinite both;
		box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
	}

	.dots span:nth-child(1) { animation-delay: -0.32s; }
	.dots span:nth-child(2) { animation-delay: -0.16s; }
	.dots span:nth-child(3) { animation-delay: 0s; }

	@keyframes dotBounce {
		0%, 80%, 100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		40% {
			transform: scale(1.2);
			opacity: 1;
		}
	}

	/* Responsive */
	@media (max-width: 480px) {
		.loading-container {
			padding: 1rem;
		}
		
		.cyclist-emoji {
			font-size: 3rem;
		}
		
		.weather-icon {
			font-size: 1.5rem;
		}
		
		.loading-text h2 {
			font-size: 1.5rem;
		}
		
		.loading-text p {
			font-size: 0.9rem;
		}
	}
</style>