'use strict'

const _ = require('lodash')
const ET = require('./elementtree')
const utils = require('./utils')

const xsl = utils.xsl
const fo = utils.fo

function generate_custom(root, conf) {
  // empty table footer
  const table_footer_raw = `
  <xsl:template match="*[contains(@class, ' topic/tbody ')]" name="topic.tbody">
    <fo:table-footer xsl:use-attribute-sets="tgroup.tfoot">
      <fo:table-row>
        <fo:table-cell number-columns-spanned="{../@cols}"/>
      </fo:table-row>
    </fo:table-footer>
    <fo:table-body xsl:use-attribute-sets="tgroup.tbody">
      <xsl:call-template name="commonattributes"/>
      <xsl:apply-templates/>
    </fo:table-body>
  </xsl:template>
`
  // table footer with "table continued"
  const table_continued_raw = `
  <xsl:variable name="table.frame-default" select="'all'"/>

  <xsl:template match="*[contains(@class, ' topic/tbody ')]" name="topic.tbody">
    <fo:table-footer xsl:use-attribute-sets="tgroup.tfoot table__tableframe__top">
      <fo:retrieve-table-marker retrieve-class-name="e:continued" retrieve-position-within-table="last-ending" retrieve-boundary-within-table="table-fragment"/>
    </fo:table-footer>
    <fo:table-body xsl:use-attribute-sets="tgroup.tbody">
      <xsl:call-template name="commonattributes"/>
      <fo:marker marker-class-name="e:continued">
        <fo:table-row>
          <fo:table-cell xsl:use-attribute-sets="e:tfoot.row.entry.continued" number-columns-spanned="{../@cols}">
            <xsl:variable name="frame">
              <xsl:choose>
                <xsl:when test="../../@frame">
                  <xsl:value-of select="../../@frame"/>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="$table.frame-default"/>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:if test="$frame = 'all' or $frame = 'topbot' or $frame = 'bottom'">
              <xsl:call-template name="processAttrSetReflection">
                <xsl:with-param name="attrSet" select="'__tableframe__top'"/>
                <xsl:with-param name="path" select="$tableAttrs"/>
              </xsl:call-template>
            </xsl:if>
            <fo:block>
              <xsl:call-template name="getVariable">
                <xsl:with-param name="id" select="'#table-continued'"/>
              </xsl:call-template>
            </fo:block>
          </fo:table-cell>
        </fo:table-row>
      </fo:marker>
      <xsl:apply-templates/>
    </fo:table-body>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/tbody ')]/*[contains(@class, ' topic/row ')]" name="topic.tbody_row">
    <fo:table-row xsl:use-attribute-sets="tbody.row">
      <xsl:call-template name="commonattributes"/>
      <xsl:if test="not(following-sibling::*)">
        <fo:marker marker-class-name="e:continued"/>
      </xsl:if>
      <xsl:apply-templates/>
    </fo:table-row>
  </xsl:template>
`
  const dl_list_raw = `
  <xsl:template match="*[contains(@class, ' topic/dl ')]">
    <fo:list-block xsl:use-attribute-sets="ul e:dl">
      <xsl:call-template name="commonattributes"/>
      <xsl:apply-templates select="*[contains(@class, ' topic/dlentry ')]"/>
    </fo:list-block>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/dlentry ')]">
    <fo:list-item xsl:use-attribute-sets="ul.li">
      <fo:list-item-label xsl:use-attribute-sets="ul.li__label">
        <fo:block xsl:use-attribute-sets="ul.li__label__content">
          <xsl:call-template name="commonattributes"/>
          <xsl:call-template name="getVariable">
            <xsl:with-param name="id" select="'Unordered List bullet'"/>
          </xsl:call-template>
        </fo:block>
      </fo:list-item-label>
      <fo:list-item-body xsl:use-attribute-sets="ul.li__body">
        <fo:block xsl:use-attribute-sets="ul.li__content">
          <xsl:apply-templates select="*[contains(@class, ' topic/dt ')]"/>
          <xsl:apply-templates select="*[contains(@class, ' topic/dd ')]"/>
        </fo:block>
      </fo:list-item-body>
    </fo:list-item>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/dt ')]">
    <fo:block xsl:use-attribute-sets="e:dlentry.dt__content">
      <xsl:apply-templates/>
    </fo:block>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/dd ')]">
    <fo:block xsl:use-attribute-sets="e:dlentry.dd__content">
      <xsl:apply-templates/>
    </fo:block>
  </xsl:template>
`
  const dl_html_raw = `
  <xsl:template match="*[contains(@class, ' topic/dl ')]">
    <fo:block xsl:use-attribute-sets="e:dl">
      <xsl:call-template name="commonattributes" />
      <xsl:apply-templates select="*[contains(@class, ' topic/dlentry ')]" />
    </fo:block>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/dlentry ')]">
      <fo:block>
          <xsl:apply-templates select="*[contains(@class, ' topic/dt ')]" />
          <xsl:apply-templates select="*[contains(@class, ' topic/dd ')]" />
      </fo:block>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/dt ')]">
    <fo:block xsl:use-attribute-sets="e:dlentry.dt__content">
      <xsl:apply-templates />
    </fo:block>
  </xsl:template>

  <xsl:template match="*[contains(@class, ' topic/dd ')]">
    <fo:block xsl:use-attribute-sets="e:dlentry.dd__content">
      <xsl:apply-templates />
    </fo:block>
  </xsl:template>
`

  const table_title_number_document = `
<xsl:template match="*[contains(@class, ' topic/table ')]/*[contains(@class, ' topic/title ')]" mode="table.title-number">
  <xsl:value-of select="count(key('enumerableByClass', 'topic/table')[. &lt;&lt; current()])"/>
</xsl:template>`

//    const table_title_number_topic = `
//<xsl:template match="*[contains(@class, ' topic/table ')]/*[contains(@class, ' topic/title ')]" mode="table.title-number">
//  <xsl:variable name="topicref" select="key('map-id', ancestor-or-self::*[contains(@class, ' topic/topic ')][1]/@id)"/>
//  <xsl:apply-templates select="$topicref" mode="topicTitleNumber"/>
//  <xsl:text>&#x2013;</xsl:text>
//  <xsl:value-of select="count(key('enumerableByClass', 'topic/table', ancestor::*[contains(@class, ' topic/topic ')][1])[. &lt;&lt; current()])"/>
//</xsl:template>`

  const table_title_number_chapter = `
<xsl:template match="*[contains(@class, ' topic/table ')]/*[contains(@class, ' topic/title ')]" mode="table.title-number">
  <xsl:call-template name="getChapterPrefix"/>
  <xsl:value-of select="count(key('enumerableByClass', 'topic/table', ancestor::*[contains(@class, ' topic/topic ')][last()])[. &lt;&lt; current()])"/>
</xsl:template>`

  // caption position after table
  const table_title_raw = `
<xsl:template match="*[contains(@class, ' topic/table ')]">
  <xsl:variable name="scale">
    <xsl:call-template name="getTableScale"/>
  </xsl:variable>
  <fo:block xsl:use-attribute-sets="table">
    <xsl:call-template name="commonattributes"/>
    <xsl:if test="not(@id)">
      <xsl:attribute name="id">
        <xsl:call-template name="get-id"/>
      </xsl:attribute>
    </xsl:if>
    <xsl:if test="not($scale = '')">
      <xsl:attribute name="font-size" select="concat($scale, '%')"/>
    </xsl:if>
    <xsl:apply-templates select="*[contains(@class, ' topic/tgroup ')]"/>
    <xsl:apply-templates select="*[contains(@class, ' topic/title ') or contains(@class, ' topic/desc ')]"/>
  </fo:block>
</xsl:template>`

  root.append(ET.Comment("table"))
  // caption numbering
  const tableCaptionNumber = _.get(conf.style.table, "caption-number")
  switch (tableCaptionNumber) {
    //case "topic":
    //  utils.copy_xml(root, table_title_number_topic)
    //  break
    case "chapter":
      utils.copy_xml(root, table_title_number_chapter)
      break
    case "document":
      utils.copy_xml(root, table_title_number_document)
      break
  }
  // caption position
  if(_.has(conf.style, "table") && _.has(conf.style.table, "caption-position") && conf.style.table["caption-position"] === "after") {
    utils.copy_xml(root, table_title_raw)
  }
  if(conf.table_continued) {
    utils.copy_xml(root, table_continued_raw)
  } else {
    utils.copy_xml(root, table_footer_raw)
  }
  if(_.has(conf.style.dl, "dl-type")) {
    if(conf.style.dl["dl-type"] === "list") {
      root.append(ET.Comment("dl"))
      utils.copy_xml(root, dl_list_raw)
    } else if(conf.style.dl["dl-type"] === "html") {
      root.append(ET.Comment("dl"))
      utils.copy_xml(root, dl_html_raw)
    }
  }
}

function generate_custom_attr(root, conf) {
  // dl
  if(_.has(conf.style.dl, "dl-type")) {
    conf.attribute_set(root, "dl", "e:dl")
    const dt_attr = ET.SubElement(root, xsl('attribute-set'), {name: 'e:dlentry.dt__content'})
    ET.SubElement(dt_attr, xsl('attribute'), {name: 'font-weight'}).text = "bold"
    ET.SubElement(dt_attr, xsl('attribute'), {name: 'keep-with-next'}).text = "always"
    const dd_attr = ET.SubElement(root, xsl('attribute-set'), {name: 'e:dlentry.dd__content'})
    if(conf.style.dl["dl-type"] === "html") {
      ET.SubElement(dd_attr, xsl('attribute'), {name: 'start-indent'}).text = "from-parent(start-indent) + 5mm"
    }
  }
  // table continued
  if(conf.table_continued) {
    const table_continued_attr = ET.SubElement(root, xsl('attribute-set'), {"name": "e:tfoot.row.entry.continued"})
    ET.SubElement(table_continued_attr, xsl('attribute'), {name: 'border-right-style'}).text = "hidden"
    ET.SubElement(table_continued_attr, xsl('attribute'), {name: 'border-left-style'}).text = "hidden"
    ET.SubElement(table_continued_attr, xsl('attribute'), {name: 'text-align'}).text = "end"
    ET.SubElement(table_continued_attr, xsl('attribute'), {name: 'font-style'}).text = "italic"
  }
  // table
  conf.attribute_set(root, "table", "table.tgroup")
  const thead_row_entry_attr = ET.SubElement(root, xsl('attribute-set'), {name: "thead.row.entry"})
  ET.SubElement(thead_row_entry_attr, xsl('attribute'), {name: "background-color"}).text = "inherit"
}

module.exports = {
  xsl: generate_custom,
  attr: generate_custom_attr
}
