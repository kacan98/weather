<script lang="ts">
	import { componentStyles, cn } from '$lib/styles/design-system';
	
	export let variant: 'glass' | 'compact' | 'info' | 'chart' | 'loading' = 'glass';
	let className: string = '';
	export { className as class };
	
	$: cardClass = cn(
		variant === 'glass' ? componentStyles.glassCard :
		variant === 'compact' ? componentStyles.glassCardCompact :
		variant === 'info' ? componentStyles.infoCard :
		variant === 'chart' ? componentStyles.chartContainer :
		variant === 'loading' ? componentStyles.loadingContainer :
		componentStyles.glassCard,
		className
	);
</script>

<div class={cardClass}>
	<slot />
</div>