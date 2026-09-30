package com.attentionfirewall

import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

data class DailyTarget(val id: String, val title: String, val completed: Boolean = false)

class DailyTargetStore(private val secureStore: SecureLocalStore) {
    private companion object { const val KEY = "daily_target_contract_v1"; const val MAX = 7 }
    private fun dayKey(): String { val c = Calendar.getInstance(); return "%04d-%03d".format(c.get(Calendar.YEAR), c.get(Calendar.DAY_OF_YEAR)) }
    fun get(): List<DailyTarget> = runCatching {
        val o = JSONObject(secureStore.get(KEY) ?: return emptyList())
        if (o.optString("date") != dayKey()) return emptyList()
        val a = o.optJSONArray("targets") ?: return emptyList()
        buildList { for (i in 0 until a.length()) { val x=a.optJSONObject(i)?:continue; val title=x.optString("title").trim(); if(title.isNotBlank()) add(DailyTarget(x.optString("id").ifBlank { "t"+(i+1) },title.take(180),x.optBoolean("completed"))) } }.take(MAX)
    }.getOrDefault(emptyList())
    fun setToday(titles: List<String>) {
        val clean=titles.map{it.trim().take(180)}.filter{it.isNotBlank()}.distinct().take(MAX); require(clean.isNotEmpty())
        val a=JSONArray(); clean.forEachIndexed{i,t->a.put(JSONObject().put("id","t"+(i+1)).put("title",t).put("completed",false))}
        secureStore.put(KEY,JSONObject().put("date",dayKey()).put("morningPrompted",true).put("extraGoalPrompted",false).put("targets",a).toString()); secureStore.put("morning_prompt_pending","0")
    }
    fun markCompleted(id:String):Boolean { val c=get(); val n=c.indexOfFirst{it.id==id}; if(n<0)return false; persist(c.mapIndexed{i,t->if(i==n)t.copy(completed=true)else t},extraGoalPrompted()); return true }
    fun appendGoal(title:String):Boolean { val t=title.trim().take(180); val c=get(); if(t.isBlank()||c.size>=MAX)return false; persist(c+DailyTarget("t"+(c.size+1),t,false),true); return true }
    fun incomplete()=get().filterNot{it.completed}
    fun allCompleted()=get().isNotEmpty()&&incomplete().isEmpty()
    fun extraGoalPrompted()=runCatching{JSONObject(secureStore.get(KEY)?:"{}").optBoolean("extraGoalPrompted")}.getOrDefault(false)
    fun markExtraGoalPrompted(){persist(get(),true)}
    fun morningPromptPending()=get().isEmpty()||secureStore.get("morning_prompt_pending")=="1"
    fun setWakePending(){if(morningPromptPending())secureStore.put("morning_prompt_pending","1")}
    private fun persist(t:List<DailyTarget>,extra:Boolean){val a=JSONArray();t.take(MAX).forEach{a.put(JSONObject().put("id",it.id).put("title",it.title).put("completed",it.completed))};secureStore.put(KEY,JSONObject().put("date",dayKey()).put("morningPrompted",true).put("extraGoalPrompted",extra).put("targets",a).toString());secureStore.put("morning_prompt_pending","0")}
}