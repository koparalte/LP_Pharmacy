'use server';

/**
 * @fileOverview This file defines a Genkit flow for automatically tagging new inventory items using AI.
 *
 * The flow takes an item description as input and returns a set of tags.
 *
 * @remarks
 * - tagNewInventory - A function that handles the tagging process.
 * - TagNewInventoryInput - The input type for the tagNewInventory function.
 * - TagNewInventoryOutput - The return type for the tagNewInventory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TagNewInventoryInputSchema = z.object({
  itemDescription: z
    .string()
    .describe('A detailed description of the new inventory item.'),
});
export type TagNewInventoryInput = z.infer<typeof TagNewInventoryInputSchema>;

const TagNewInventoryOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe('An array of tags generated for the inventory item.'),
});
export type TagNewInventoryOutput = z.infer<typeof TagNewInventoryOutputSchema>;

export async function tagNewInventory(input: TagNewInventoryInput): Promise<TagNewInventoryOutput> {
  return tagNewInventoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'tagNewInventoryPrompt',
  input: {schema: TagNewInventoryInputSchema},
  output: {schema: TagNewInventoryOutputSchema},
  prompt: `You are an inventory management expert for a pharmacy. Your task is to generate a set of relevant tags for new inventory items based on their description.

  Description: {{{itemDescription}}}

  Please provide a list of tags that are relevant to the item. The tags should be concise and descriptive, suitable for categorization and search.
  The output should be a JSON array of strings.
  `, // Ensure the output is a JSON array of strings
});

const tagNewInventoryFlow = ai.defineFlow(
  {
    name: 'tagNewInventoryFlow',
    inputSchema: TagNewInventoryInputSchema,
    outputSchema: TagNewInventoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
