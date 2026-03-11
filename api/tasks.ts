import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {

  const { method, query } = req
  const { complete } = query

  try {

    if (method === 'GET') {

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json(error)
      }

      return res.status(200).json(data)
    }

    if (method === 'POST' && complete) {

      const { userId, taskId, proofUrl } = req.body

      const { error } = await supabase
        .from('user_tasks')
        .insert([
          {
            user_id: userId,
            task_id: taskId,
            proof_url: proofUrl,
            status: 'pending'
          }
        ])

      if (error) {
        return res.status(500).json(error)
      }

      return res.json({
        success: true,
        message: "Tarefa enviada para verificação!"
      })
    }

    return res.status(405).json({ error: "Method not allowed" })

  } catch (err:any) {

    return res.status(500).json({
      error: err.message
    })

  }

}