import type { AnswerBlock } from '@/api/blocks'
import { CitationsBlock } from './blocks/CitationsBlock'
import { CollapsibleBlock } from './blocks/CollapsibleBlock'
import { DeadlineBlock } from './blocks/DeadlineBlock'
import { DocumentsBlock } from './blocks/DocumentsBlock'
import { DownloadFormBlock } from './blocks/DownloadFormBlock'
import { FeeBlock } from './blocks/FeeBlock'
import { FeedbackBlock } from './blocks/FeedbackBlock'
import { PlaceBlock } from './blocks/PlaceBlock'
import { RelatedServicesBlock } from './blocks/RelatedServicesBlock'
import { ServiceHeaderBlock } from './blocks/ServiceHeaderBlock'

type AnswerBlocksProps = {
  blocks: AnswerBlock[]
  onAsk?: (query: string) => void
}

function renderBlock(block: AnswerBlock, index: number, onAsk?: (query: string) => void) {
  switch (block.type) {
    case 'serviceHeader':
      return <ServiceHeaderBlock key={index} {...block} />
    case 'documents':
      return <DocumentsBlock key={index} {...block} />
    case 'downloadForm':
      return <DownloadFormBlock key={index} {...block} />
    case 'fee':
      return <FeeBlock key={index} {...block} />
    case 'deadline':
      return <DeadlineBlock key={index} {...block} />
    case 'place':
      return <PlaceBlock key={index} {...block} />
    case 'collapsible':
      return <CollapsibleBlock key={index} {...block} />
    case 'relatedServices':
      return <RelatedServicesBlock key={index} {...block} onAsk={onAsk} />
    case 'citations':
      return <CitationsBlock key={index} {...block} />
    case 'feedbackPrompt':
      return <FeedbackBlock key={index} {...block} />
    default:
      return null
  }
}

export function AnswerBlocks({ blocks, onAsk }: AnswerBlocksProps) {
  if (blocks.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-[var(--space-3)] mt-[var(--space-4)]">
      {blocks.map((block, index) => renderBlock(block, index, onAsk))}
    </div>
  )
}
