import { serializeJsonLd, type JsonLd as JsonLdData } from './structured-data'

/**
 * One schema.org block in the server-rendered HTML. A native `<script>`, not
 * `next/script`: this is data for a crawler, not code to load and run.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
