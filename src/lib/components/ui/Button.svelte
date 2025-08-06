<script lang="ts">
	import { componentStyles, cn } from '$lib/styles/design-system';
	
	export let variant: 'primary' | 'secondary' | 'active' = 'primary';
	export let size: 'sm' | 'md' | 'lg' = 'md';
	export let disabled = false;
	export let onclick: (() => void) | undefined = undefined;
	let className: string = '';
	export { className as class };
	
	$: buttonClass = cn(
		// Base styles from design system
		variant === 'primary' ? componentStyles.primaryButton :
		variant === 'active' ? componentStyles.activeButton :
		componentStyles.secondaryButton,
		
		// Size variations
		size === 'sm' ? 'px-3 py-1.5 text-sm' :
		size === 'lg' ? 'px-10 py-4 text-base' :
		'px-4 py-2 text-sm',
		
		// Custom classes
		className
	);
</script>

<button 
	{disabled}
	class={buttonClass}
	on:click={onclick}
	on:click
>
	<slot />
</button>